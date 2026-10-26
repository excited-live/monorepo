import { z } from "zod";

/**
 * The schema a tool publishes in `tools/list` (#201).
 *
 * The MCP SDK publishes a tool's input by normalising it to a *root object*
 * schema (`normalizeObjectSchema`); anything else — a `z.discriminatedUnion`
 * included — falls back to `{ type: "object", properties: {} }`. That is fine
 * for validation (the SDK then parses against the union directly) but a
 * schema-driven client renders zero input fields, so `add_asset`,
 * `add_liability` and `add_income` were uncallable from any client that trusts
 * `tools/list` even though their runtime contract is the REST body schema.
 *
 * So publish one object that flattens the union variants: a key accepted by
 * every variant is described once, a key only some variants accept stays
 * optional, and the discriminator becomes an enum of its literals. The real
 * union is still enforced on every call — each handler re-parses with
 * `parseBody` against the REST schema — so this widens what a client can
 * *see*, never what the server *accepts*, and it cannot drift from the
 * validators: it is derived from them at import time.
 *
 * `assertPublishable` in `mcp.test.ts` keeps the two in step.
 */

type AnyZod = z.ZodType<unknown>;

/** The type name zod v4 stores on `_zod.def`, e.g. `object`, `optional`, `literal`. */
function zodType(schema: AnyZod): string | undefined {
	return (schema as unknown as { _zod?: { def?: { type?: string } } })._zod?.def?.type;
}

function defOf(schema: AnyZod): Record<string, unknown> {
	return ((schema as unknown as { _zod?: { def?: Record<string, unknown> } })._zod?.def ?? {}) as Record<
		string,
		unknown
	>;
}

/** True for `z.undefined()`/`z.never()` possibly wrapped in `.optional()`. */
function acceptsNothing(schema: AnyZod): boolean {
	let current = schema;
	for (let depth = 0; depth < 5; depth += 1) {
		const type = zodType(current);
		if (type === "undefined" || type === "never") return true;
		if (type !== "optional" && type !== "nullable" && type !== "default" && type !== "prefault") return false;
		current = defOf(current).innerType as AnyZod;
	}
	return false;
}

function isOptional(schema: AnyZod): boolean {
	const result = schema.safeParse(undefined);
	return result.success;
}

/** A stable identity for a field, used to collapse identical variants. */
function signature(schema: AnyZod): string {
	try {
		return JSON.stringify(z.toJSONSchema(schema, { io: "input" }));
	} catch {
		return String(schema);
	}
}

function literalValue(schema: AnyZod): string | undefined {
	const def = defOf(schema);
	if (zodType(schema) === "literal") {
		const values = (def.values ?? []) as unknown[];
		return typeof values[0] === "string" ? values[0] : undefined;
	}
	if (zodType(schema) === "enum") {
		const entries = Object.values((def.entries ?? {}) as Record<string, unknown>);
		return typeof entries[0] === "string" ? entries[0] : undefined;
	}
	return undefined;
}

/**
 * Flatten a discriminated union of object variants into one object schema.
 * Any other schema is returned unchanged.
 *
 * `fieldDescriptions` is publication-only text for fields the REST schema leaves
 * bare: a schema-driven client renders `category` as a required box with no hint,
 * and the agent guesses what goes in it. It never changes a property, a required
 * entry or a validator.
 */
export function publishableObjectSchema<S extends AnyZod>(
	schema: S,
	fieldDescriptions: Record<string, string> = {},
): S {
	if (zodType(schema) !== "union") return schema;
	const def = defOf(schema);
	const discriminator = def.discriminator;
	const options = (def.options ?? []) as AnyZod[];
	if (typeof discriminator !== "string" || options.length === 0) return schema;
	if (options.some((option) => zodType(option) !== "object")) return schema;

	const order: string[] = [];
	const variants = new Map<string, AnyZod[]>();
	const presentIn = new Map<string, number>();
	const optionalIn = new Map<string, boolean>();

	for (const option of options) {
		const shape = (option as unknown as { shape: Record<string, AnyZod> }).shape;
		for (const [key, field] of Object.entries(shape)) {
			if (acceptsNothing(field)) continue;
			if (!variants.has(key)) {
				variants.set(key, []);
				order.push(key);
			}
			variants.get(key)!.push(field);
			presentIn.set(key, (presentIn.get(key) ?? 0) + 1);
			if (isOptional(field)) optionalIn.set(key, true);
		}
	}

	const shape: Record<string, AnyZod> = {};
	const kinds: string[] = [];

	for (const key of order) {
		const candidates = variants.get(key)!;
		let field: AnyZod;

		if (key === discriminator) {
			for (const candidate of candidates) {
				const value = literalValue(candidate);
				if (value && !kinds.includes(value)) kinds.push(value);
			}
			field = z.enum(kinds as [string, ...string[]]);
		} else {
			const distinct: AnyZod[] = [];
			const seen = new Set<string>();
			for (const candidate of candidates) {
				const id = signature(candidate);
				if (seen.has(id)) continue;
				seen.add(id);
				distinct.push(candidate);
			}
			field = distinct.length === 1 ? distinct[0]! : z.union(distinct as [AnyZod, AnyZod, ...AnyZod[]]);
		}

		// Required only when every variant both accepts the key and requires it.
		const required = presentIn.get(key) === options.length && !optionalIn.get(key);
		const published = required ? field : field.optional();
		const note = fieldDescriptions[key];
		shape[key] = note ? published.describe(note) : published;
	}

	return z.object(shape) as unknown as S;
}
