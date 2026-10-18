import { describeRoute, resolver, type ContentWithResolver, type DescribeRouteOptions } from "hono-openapi"
import type { z } from "zod"
import { ErrorSchema } from "./schemas"

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
		{ name: "Accounting", description: "The per-user accounting snapshot: accounts, expenses, assets, incomes, liabilities and transfers." },
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
