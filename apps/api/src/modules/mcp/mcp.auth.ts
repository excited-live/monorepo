import { apiKeyApi } from "@excited-live/auth";
import type { Context } from "hono";
import type { ApiEnv } from "../../lib/env";
import { getTokensAuth, requestOrigin, tokensAuthConfigured } from "../../lib/auth";
import {
	looksLikeJwt,
	oauthConfigured,
	verifyOAuthAccessToken,
} from "../../lib/oauth";

/**
 * Principal resolution for `/mcp` (separate from the `/api/v1/*` identity
 * middleware because MCP accepts API keys in addition to sessions).
 *
 * Order:
 *   1. API key — `Authorization: Bearer elk_…` or `x-api-key: elk_…`
 *      (`verifyApiKey`); scopes come from the key's permissions.
 *   2. OAuth 2.1 access token — a JWT from the webapp authorization server,
 *      verified against its JWKS plus issuer, audience and expiry; scopes come
 *      from the `scope` claim (`onboarding` → read + write). Only attempted
 *      when `EXCITED_WEBAPP_URL` is configured.
 *   3. Any other Bearer → Better Auth session; all scopes. This is what the
 *      device flow's `/device/token` issues (a first-party session token) and
 *      what the mobile app's bearer session uses.
 *   4. Auth not configured → dev passthrough (`x-user-id`, else `default`),
 *      all scopes, matching the identity middleware's unconfigured mode.
 *   5. Anything else → null (the route answers 401 + WWW-Authenticate).
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

	// OAuth access token: JWT compact serialization (three parts). Anything
	// that fails verification falls through to the session branch below, which
	// is where opaque device-flow and mobile tokens land.
	if (oauthConfigured() && looksLikeJwt(bearer)) {
		const principal = await verifyOAuthAccessToken(c.req.url, bearer);
		if (principal) {
			return { userId: principal.userId, scopes: principal.scopes, via: "oauth" };
		}
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) return null;
	return { userId: session.user.id, scopes: new Set(ALL_SCOPES), via: "session" };
}

/** 401 in the shape the MCP Streamable HTTP spec expects, pointing at the resource metadata. */
export function unauthorizedResponse(requestUrl: string): Response {
	const origin = requestOrigin(requestUrl);
	return new Response(JSON.stringify({ error: "unauthorized" }), {
		status: 401,
		headers: {
			"content-type": "application/json",
			"www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
		},
	});
}
