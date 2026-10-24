/**
 * Generates `src/generated/endpoints.ts` from `apps/api/openapi.json`.
 *
 * Why generate instead of fetching `/openapi.json` in the browser: the Data tab
 * must render instantly, offline, and identically on a static Pages deploy. The
 * spec is already committed and versioned with the API, so the app compiles the
 * catalog in — and `pnpm gen:catalog` (run by `pnpm gen:openapi` in apps/api)
 * keeps it from drifting behind the routes.
 *
 * Output is deterministic (paths in spec order, no timestamps) so a diff only
 * appears when the API actually changes.
 *
 * Run: pnpm --filter @excited-live/iam gen:catalog
 */
/* global console */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const specFile = join(root, "..", "api", "openapi.json")
const outFile = join(root, "src", "generated", "endpoints.ts")

const spec = JSON.parse(readFileSync(specFile, "utf8"))
const METHODS = ["get", "post", "put", "patch", "delete"]

const refName = (ref) => ref.split("/").pop()

/** Follow `$ref` one level into components; `null` when it is not a ref. */
function deref(schema) {
	if (!schema?.$ref) return null
	return spec.components?.schemas?.[refName(schema.$ref)] ?? null
}

/** Collapse oneOf/anyOf/allOf into the first branch that carries properties. */
function shape(schema) {
	if (!schema) return null
	const direct = deref(schema)
	if (direct) return shape(direct)
	if (schema.properties) return schema
	for (const key of ["oneOf", "anyOf", "allOf"]) {
		const branch = schema[key]?.find((entry) => shape(entry)?.properties)
		if (branch) return shape(branch)
	}
	return schema
}

function typeLabel(schema) {
	if (!schema) return "any"
	if (schema.$ref) return refName(schema.$ref)
	if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ")
	if (schema.type === "array") return `array<${typeLabel(schema.items)}>`
	if (Array.isArray(schema.type)) return schema.type.join(" | ")
	return schema.type ?? "any"
}

/** Top-level writable fields, required first, each with the facts a form needs. */
function fields(schema) {
	const shaped = shape(schema)
	if (!shaped?.properties) return []
	const required = new Set(shaped.required ?? [])
	return Object.entries(shaped.properties).map(([name, prop]) => ({
		name,
		type: typeLabel(prop),
		required: required.has(name),
		description: prop.description ?? "",
		...(prop.enum ? { enum: prop.enum } : {}),
		...(typeof prop.minimum === "number" ? { min: prop.minimum } : {}),
		...(typeof prop.maximum === "number" ? { max: prop.maximum } : {}),
		...(prop.format ? { format: prop.format } : {}),
	}))
}

/** A fill-in draft: required fields first, with neutral but valid-looking values. */
function draft(schema) {
	const shaped = shape(schema)
	if (!shaped?.properties) return null
	const required = new Set(shaped.required ?? [])
	const out = {}
	const entries = Object.entries(shaped.properties).sort(
		([a], [b]) => Number(required.has(b)) - Number(required.has(a)),
	)
	for (const [name, prop] of entries) {
		const isRequired = required.has(name)
		if (!isRequired && Object.keys(out).length >= 1) break
		if (prop.enum) out[name] = prop.enum[0]
		else if (prop.type === "number" || prop.type === "integer") out[name] = prop.minimum ?? 0
		else if (prop.type === "boolean") out[name] = false
		else if (prop.type === "array") out[name] = []
		else if (prop.type === "object") out[name] = {}
		else out[name] = ""
	}
	return Object.keys(out).length > 0 ? out : null
}

function slug(method, path) {
	return `${method}-${path.replace(/^\/+/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "")}`
}

const endpoints = []
for (const [path, item] of Object.entries(spec.paths)) {
	for (const method of METHODS) {
		const op = item[method]
		if (!op) continue
		const params = (op.parameters ?? []).map((param) => ({
			name: param.name,
			in: param.in,
			required: Boolean(param.required),
			type: typeLabel(param.schema),
			description: param.description ?? "",
		}))
		const bodySchema = op.requestBody?.content?.["application/json"]?.schema
		const okStatus = Object.keys(op.responses ?? {}).find((status) => status.startsWith("2"))
		const okSchema = okStatus ? op.responses[okStatus]?.content?.["application/json"]?.schema : undefined
		endpoints.push({
			id: slug(method, path),
			method: method.toUpperCase(),
			path,
			summary: op.summary ?? path,
			description: op.description ?? "",
			tag: op.tags?.[0] ?? "Other",
			params,
			body: bodySchema ? { fields: fields(bodySchema), draft: draft(bodySchema) } : null,
			response: okSchema?.$ref ? refName(okSchema.$ref) : okSchema ? typeLabel(okSchema) : null,
			status: okStatus ?? "200",
		})
	}
}

const banner = `/**
 * GENERATED — do not edit.
 *
 * Source: apps/api/openapi.json (${Object.keys(spec.paths).length} paths).
 * Regenerate: pnpm --filter @excited-live/iam gen:catalog
 * (apps/api's \`gen:openapi\` runs this automatically.)
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface EndpointField {
	name: string
	type: string
	required: boolean
	description: string
	enum?: string[]
	min?: number
	max?: number
	format?: string
}

export interface EndpointParam {
	name: string
	in: string
	required: boolean
	type: string
	description: string
}

export interface Endpoint {
	id: string
	method: HttpMethod
	path: string
	summary: string
	description: string
	tag: string
	params: EndpointParam[]
	body: { fields: EndpointField[]; draft: Record<string, unknown> | null } | null
	response: string | null
	status: string
}

export const API_TITLE = ${JSON.stringify(spec.info?.title ?? "excited.live API")}
export const API_VERSION = ${JSON.stringify(spec.info?.version ?? "0.0.0")}
export const ENDPOINTS: readonly Endpoint[] = `

const typescript = `${banner}${JSON.stringify(endpoints, null, "\t")} as const

/** Tags in first-seen order, for the Data tab's left rail. */
export const ENDPOINT_TAGS: readonly string[] = [
	...new Set(ENDPOINTS.map((endpoint) => endpoint.tag)),
]
`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, typescript)
console.log(`Wrote ${endpoints.length} endpoints from ${Object.keys(spec.paths).length} paths to ${outFile}`)
