import { describeRoute, resolver, type ContentWithResolver, type DescribeRouteOptions } from "hono-openapi"
import type { z } from "zod"
import { ErrorSchema, OkSchema } from "./schemas"

/**
 * Helpers that attach OpenAPI metadata to routes via `describeRoute()`.
 *
 * `describeRoute` is documentation-only middleware: it records the operation
 * for the generated spec and calls `next()`. It never validates or rewrites a
 * request, so annotating a route cannot change its behaviour.
 */

type Schema = z.ZodType

export function jsonContent(schema: Schema): ContentWithResolver {
	return { "application/json": { schema: resolver(schema) } }
}

export function jsonBody(schema: Schema, description?: string): { description?: string; required: true; content: ContentWithResolver } {
	return { description, required: true, content: jsonContent(schema) }
}

export function jsonResponse(description: string, schema: Schema): { description: string; content: ContentWithResolver } {
	return { description, content: jsonContent(schema) }
}

const unauthorized = jsonResponse("Missing or invalid bearer token (only when auth is configured).", ErrorSchema)

/** `describeRoute` with the shared 401 response merged in. */
export function route(options: DescribeRouteOptions) {
	return describeRoute({
		...options,
		responses: { ...options.responses, 401: unauthorized },
	})
}

/**
 * The four CRUD operations over one entity collection that lives inside the
 * per-user biz snapshot (`/api/v1/biz/<collection>`).
 */
export function crudDocs(config: {
	tag: string
	singular: string
	plural: string
	schema: z.ZodObject
	/** Lowercase noun phrase for prose; defaults to `singular`. */
	label?: string
}) {
	const { tag, singular, plural, schema } = config
	const label = config.label ?? singular.toLowerCase()
	const a = `${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`
	const idParam = { name: "id", in: "path", required: true, description: `The ${label}'s \`id\`.`, schema: { type: "string" } } as const
	return {
		list: route({
			tags: [tag],
			operationId: `list${plural}`,
			summary: `List ${plural.toLowerCase()}`,
			description: `Returns every ${label} the caller owns. A user who never saved gets the seed data.`,
			responses: { 200: jsonResponse(`All ${plural.toLowerCase()}.`, schema.array()) },
		}),
		create: route({
			tags: [tag],
			operationId: `create${singular}`,
			summary: `Create ${a}`,
			description: "The client supplies the `id`. The record is appended to the caller's snapshot.",
			requestBody: jsonBody(schema),
			responses: { 201: jsonResponse(`The created ${label}.`, schema) },
		}),
		update: route({
			tags: [tag],
			operationId: `update${singular}`,
			summary: `Update ${a}`,
			description: `Shallow-merges the body into the ${label} with this id. Unknown ids are a silent no-op.`,
			parameters: [idParam],
			requestBody: jsonBody(schema.partial(), "Any subset of the fields."),
			responses: { 200: jsonResponse("Updated.", OkSchema) },
		}),
		remove: route({
			tags: [tag],
			operationId: `delete${singular}`,
			summary: `Delete ${a}`,
			description: `Removes the ${label} with this id. Unknown ids are a silent no-op.`,
			parameters: [idParam],
			responses: { 200: jsonResponse("Deleted.", OkSchema) },
		}),
	}
}

export const documentation = {
	openapi: "3.1.0",
	info: {
		title: "excited.live API",
		version: "0.0.1",
		description:
			"REST API behind excited.live. Every endpoint is under `/api/v1` and scoped to the authenticated user.\n\n" +
			"**Authentication.** Send `Authorization: Bearer <token>` (a Better Auth session token or API key). " +
			"On environments where auth is not configured (local dev, previews) the API trusts an `x-user-id` header instead, " +
			"and falls back to a shared `default` bucket.",
	},
	tags: [
		{ name: "Accounts", description: "Personal and business entities." },
		{ name: "Subscriptions", description: "Recurring costs." },
		{ name: "Hardware", description: "Depreciating assets." },
		{ name: "Revenues", description: "Income streams." },
		{ name: "Liabilities", description: "Debt payment streams." },
		{ name: "Transfers", description: "Capital moved between entities." },
		{ name: "Biz", description: "Whole-snapshot access and computed ledger." },
		{ name: "Plan", description: "The user's financial plan document." },
		{ name: "Settings", description: "Profile settings." },
		{ name: "Simulation", description: "Stateless plan simulations." },
		{ name: "Catalog", description: "Autofill catalog for subscriptions and hardware." },
		{ name: "Auth", description: "Session check. The rest of the Better Auth surface is served under `/api/v1/auth/*`." },
		{ name: "System", description: "Health and discovery." },
	],
	components: {
		securitySchemes: {
			bearerAuth: { type: "http" as const, scheme: "bearer", description: "Better Auth session token or API key." },
		},
	},
	security: [{ bearerAuth: [] }],
}
