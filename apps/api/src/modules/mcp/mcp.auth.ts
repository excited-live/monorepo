import { apiKeyApi } from "@excited-live/auth";
import type { Context } from "hono";
import type { ApiEnv } from "../../lib/env";
import { getTokensAuth, tokensAuthConfigured } from "../../lib/auth";

/**
 * Principal resolution for `/mcp` (separate from the `/api/v1/*` identity
 * middleware because MCP accepts API keys in addition to sessions).
 *
 * Order:
 *   1. `Authorization: Bearer elk_…` or `x-api-key: elk_…` → API key
 *      (`verifyApiKey`); scopes come from the key's permissions.
 *   2. Any other Bearer → Better Auth session; all scopes.
 *   3. Auth not configured → dev passthrough (`x-user-id`, else `default`),
 *      all scopes, matching the identity middleware's unconfigured mode.
 *   4. Anything else → null (the route answers 401 + WWW-Authenticate).
 *
 * A2 will insert OAuth JWT verification between steps 1 and 2.
 */

export type McpVia = "apiKey" | "oauth" | "session" | "dev";

export interface McpPrincipal {
	userId: string;
	scopes: Set<string>;
	via: McpVia;
}

/** The `elk_` prefix is set by packages/auth's apiKey configuration. */
export const API_KEY_PREFIX = "elk_";

export const ALL_SCOPES = [
	"onboarding:read",
	"onboarding:write",
	"accounting:read",
	"accounting:write",
] as const;

function bearerToken(header: string | undefined): string | undefined {
	if (!header) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match?.[1]?.trim() || undefined;
}

function scopesFromPermissions(permissions: Record<string, string[]> | null | undefined): Set<string> {
	const scopes = new Set<string>();
	for (const [resource, actions] of Object.entries(permissions ?? {})) {
		for (const action of actions) scopes.add(`${resource}:${action}`);
	}
	return scopes;
}

export async function resolvePrincipal(c: Context<ApiEnv>): Promise<McpPrincipal | null> {
	const auth = tokensAuthConfigured() ? await getTokensAuth(c.req.url, c.env) : null;
	if (!auth) {
		return {
			userId: c.req.header("x-user-id") || "default",
			scopes: new Set(ALL_SCOPES),
			via: "dev",
		};
	}

	const bearer = bearerToken(c.req.header("authorization"));
	const apiKeyHeader = c.req.header("x-api-key");
	const apiKey = apiKeyHeader ?? (bearer?.startsWith(API_KEY_PREFIX) ? bearer : undefined);

	if (apiKey) {
		const result = await apiKeyApi(auth).verifyApiKey({ body: { key: apiKey } });
		if (!result.valid || !result.key) return null;
		return {
			userId: result.key.referenceId,
			scopes: scopesFromPermissions(result.key.permissions),
			via: "apiKey",
		};
	}

	if (!bearer) return null;

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) return null;
	return { userId: session.user.id, scopes: new Set(ALL_SCOPES), via: "session" };
}

/** 401 in the shape the MCP Streamable HTTP spec expects, pointing at the resource metadata. */
export function unauthorizedResponse(requestUrl: string): Response {
	const origin = new URL(requestUrl).origin;
	return new Response(JSON.stringify({ error: "unauthorized" }), {
		status: 401,
		headers: {
			"content-type": "application/json",
			"www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
		},
	});
}
