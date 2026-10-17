/**
 * Generates the API reference pages (content/docs/api/*.mdx) from the OpenAPI
 * document apps/api commits as openapi.json.
 *
 * Why generated MDX instead of a runtime OpenAPI component: the docs site is a
 * static Astro build, so the reference has to be plain MDX that the existing
 * docs pipeline renders. Output is committed (like apps/api's
 * migrations.generated.ts) so a docs build never depends on the API package.
 *
 * Run: pnpm --filter @excited-live/landingpage gen:api-docs
 */
/* global console */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const specFile = join(root, '..', 'api', 'openapi.json');
const outDir = join(root, 'content', 'docs', 'api');

const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const slugOf = (tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const refName = (ref) => ref.split('/').pop();
/** Text in MDX prose/table cells: neutralise JSX/expression/table syntax. */
const esc = (text = '') =>
	text
		.replace(/\|/g, '\\|')
		.replace(/\{/g, '\\{')
		.replace(/</g, '&lt;')
		.replace(/\n+/g, ' ');

/** One-line type label; collects referenced component schemas into `refs`. */
function typeOf(schema, refs) {
	if (!schema) return 'any';
	if (schema.$ref) {
		const name = refName(schema.$ref);
		refs.add(name);
		return `[${name}](#${name.toLowerCase()})`;
	}
	if (schema.enum) return schema.enum.map((v) => `\`${JSON.stringify(v)}\``).join(' \\| ');
	if (schema.anyOf || schema.oneOf) {
		return (schema.anyOf ?? schema.oneOf).map((s) => typeOf(s, refs)).join(' \\| ');
	}
	if (schema.const !== undefined) return `\`${JSON.stringify(schema.const)}\``;
	if (Array.isArray(schema.type)) return schema.type.map((t) => `\`${t}\``).join(' \\| ');
	if (schema.type === 'array') return `${typeOf(schema.items, refs)}[]`;
	if (schema.type === 'object') {
		if (schema.properties) return '`object`';
		if (schema.additionalProperties && schema.additionalProperties !== true) {
			return `map of ${typeOf(schema.additionalProperties, refs)}`;
		}
		return '`object`';
	}
	return `\`${schema.type ?? 'any'}\``;
}

/** Property rows for an object schema, expanding inline nested objects. */
function rows(schema, refs, prefix = '', depth = 0) {
	const required = new Set(schema.required ?? []);
	const out = [];
	for (const [name, prop] of Object.entries(schema.properties ?? {})) {
		const path = `${prefix}${name}`;
		out.push(
			`| \`${path}\` | ${typeOf(prop, refs)} | ${required.has(name) ? 'yes' : 'no'} | ${esc(prop.description)} |`,
		);
		const nested = prop.type === 'array' ? prop.items : prop;
		if (depth < 2 && nested?.type === 'object' && nested.properties) {
			out.push(...rows(nested, refs, `${path}${prop.type === 'array' ? '[]' : ''}.`, depth + 1));
		}
	}
	return out;
}

function propertyTable(schema, refs) {
	const body = rows(schema, refs);
	if (body.length === 0) return '';
	return ['| Field | Type | Required | Description |', '| --- | --- | --- | --- |', ...body].join('\n');
}

/** A body/response schema: a type line, plus a field table when it is an inline object. */
function schemaBlock(schema, refs) {
	const lines = [`Type: ${typeOf(schema, refs)}`];
	const inline = schema.type === 'object' && schema.properties ? propertyTable(schema, refs) : '';
	if (inline) lines.push('', inline);
	return lines.join('\n');
}

function example(method, path, op) {
	const url = `$API_URL${path.replace(/\{(\w+)\}/g, ':$1')}`;
	const parts = [`curl${method === 'get' ? '' : ` -X ${method.toUpperCase()}`} "${url}"`, '  -H "Authorization: Bearer $TOKEN"'];
	if (op.requestBody) {
		parts.push('  -H "Content-Type: application/json"', "  -d '{ ... }'");
	}
	return '```bash\n' + parts.join(' \\\n') + '\n```';
}

function operation(path, method, op, refs) {
	const out = [`## ${op.summary}`, '', `\`${method.toUpperCase()}\` \`${path}\``, ''];
	if (op.description) out.push(esc(op.description), '');
	const params = op.parameters ?? [];
	if (params.length) {
		out.push(
			'**Parameters**',
			'',
			'| Name | In | Type | Required | Description |',
			'| --- | --- | --- | --- | --- |',
			...params.map(
				(p) =>
					`| \`${p.name}\` | ${p.in} | ${typeOf(p.schema, refs)} | ${p.required ? 'yes' : 'no'} | ${esc(p.description)} |`,
			),
			'',
		);
	}
	const reqSchema = op.requestBody?.content?.['application/json']?.schema;
	if (reqSchema) {
		out.push('**Request body** (`application/json`)', '');
		if (op.requestBody.description) out.push(esc(op.requestBody.description), '');
		out.push(schemaBlock(reqSchema, refs), '');
	}
	out.push('**Responses**', '');
	for (const [status, res] of Object.entries(op.responses ?? {})) {
		const schema = res.content?.['application/json']?.schema;
		out.push(`- \`${status}\` — ${esc(res.description)}${schema ? ` ${typeOf(schema, refs)}` : ''}`);
	}
	out.push('', example(method, path, op), '');
	return out.join('\n');
}

function schemasSection(refs, seen = new Set()) {
	const out = [];
	const queue = [...refs];
	while (queue.length) {
		const name = queue.shift();
		if (seen.has(name)) continue;
		seen.add(name);
		const schema = spec.components?.schemas?.[name];
		if (!schema) continue;
		const nestedRefs = new Set();
		const table = propertyTable(schema, nestedRefs);
		out.push(`### ${name}`, '');
		if (schema.description) out.push(esc(schema.description), '');
		out.push(table || `Type: ${typeOf(schema, nestedRefs)}`, '');
		queue.push(...nestedRefs);
	}
	return out.length ? ['## Schemas', '', ...out].join('\n') : '';
}

// Group operations by their first tag, in spec order.
const tagMeta = new Map((spec.tags ?? []).map((t) => [t.name, t.description ?? '']));
const groups = new Map();
for (const [path, item] of Object.entries(spec.paths)) {
	for (const method of METHODS) {
		const op = item[method];
		if (!op) continue;
		const tag = op.tags?.[0] ?? 'Other';
		if (!groups.has(tag)) groups.set(tag, []);
		groups.get(tag).push({ path, method, op });
	}
}

const files = new Map();
const frontmatter = (title, description) =>
	`---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;
const banner = '{/* GENERATED from apps/api/openapi.json — run `pnpm --filter @excited-live/landingpage gen:api-docs`. Do not edit. */}\n\n';

for (const [tag, ops] of groups) {
	const refs = new Set();
	const body = ops.map(({ path, method, op }) => operation(path, method, op, refs)).join('\n');
	files.set(
		`${slugOf(tag)}.mdx`,
		frontmatter(tag, tagMeta.get(tag) || `${tag} endpoints.`) + banner + body + '\n' + schemasSection(refs) + '\n',
	);
}

const index = [
	frontmatter('API reference', 'REST endpoints for every entity: accounts, subscriptions, hardware, revenues, liabilities, transfers, plan and settings.'),
	banner,
	spec.info.description,
	'',
	'Examples use `$API_URL` for the API base URL and `$TOKEN` for your bearer token. The machine-readable document is the committed [`apps/api/openapi.json`](https://github.com/fromsukong/excited.live/blob/main/apps/api/openapi.json).',
	'',
	'## Endpoints',
	'',
	'| Method | Path | Summary |',
	'| --- | --- | --- |',
	...[...groups].flatMap(([tag, ops]) =>
		ops.map(
			({ path, method, op }) =>
				`| \`${method.toUpperCase()}\` | [\`${path}\`](/docs/api/${slugOf(tag)}) | ${esc(op.summary)} |`,
		),
	),
	'',
].join('\n');
files.set('index.mdx', index);
files.set(
	'meta.json',
	JSON.stringify({ title: 'API reference', pages: ['index', ...[...groups.keys()].map(slugOf)] }, null, '\t') + '\n',
);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [name, content] of files) writeFileSync(join(outDir, name), content);
console.log(`Wrote ${files.size} files to ${outDir}`);
