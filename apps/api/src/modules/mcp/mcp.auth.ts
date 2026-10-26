import { AGENT_KEY_RATE_LIMIT, apiKeyApi, type ApiKeyRecord, type ApiKeyVerifyError } from "@excited-live/auth";
import type { Context } from "hono";
import type { ApiEnv } from "../../lib/env";
import { getTokensAuth, tokensAuthConfigured } from "../../lib/auth";
import {
	looksLikeJwt,
	mcpAdvertisedOrigin,
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
 *   5. Anything else → `unauthenticated` (the route answers 401 +
 *      WWW-Authenticate).
 *
 * A key over its request budget is its own outcome (`rate_limited` → 429 +
 * Retry-After), never a 401 (#140): agents treat 401 as "credential is wrong,
 * stop and rotate", which burns a second key instead of waiting.
 */

export type McpVia = "apiKey" | "oauth" | "session" | "dev";

export interface McpPrincipal {
	userId: string;
	scopes: Set<string>;
	via: McpVia;
}

/**
 * One API key's request budget in the units the HTTP headers use: the reset
 * is Unix epoch seconds, everything else is a count.
 */
export interface RateLimitSnapshot {
	limit: number;
	remaining: number;
	reset: number;
}

export type PrincipalResolution =
	| { status: "ok"; principal: McpPrincipal; rateLimit?: RateLimitSnapshot }
	| { status: "unauthenticated" }
	| {
			status: "rate_limited";
			rateLimit: RateLimitSnapshot;
			/** Seconds until the window resets; absent when the cap never resets. */
			retryAfterSeconds?: number;
	  };

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

function toMillis(value: Date | string | null | undefined): number | undefined {
	if (!value) return undefined;
	const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isFinite(ms) ? ms : undefined;
}

/** Round up so a client that waits exactly `Retry-After` seconds is not refused again. */
function retryAfterSeconds(ms: number): number {
	return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * Budget after a successful verification. The plugin returns the key row with
 * the counters already incremented; the clamp keeps a concurrent write from
 * advertising a negative remaining.
 */
function snapshotFromKey(key: ApiKeyRecord, now = Date.now()): RateLimitSnapshot {
	const limit = key.rateLimitMax ?? AGENT_KEY_RATE_LIMIT.maxRequests;
	const windowMs = key.rateLimitTimeWindow ?? AGENT_KEY_RATE_LIMIT.timeWindowMs;
	const used = Math.max(0, key.requestCount ?? 1);
	const lastRequest = toMillis(key.lastRequest) ?? now;
	return {
		limit,
		remaining: Math.max(0, limit - used),
		reset: Math.ceil((lastRequest + windowMs) / 1000),
	};
}

/**
 * Budget on a refusal. `verifyApiKey` returns no key row on a 429, so the
 * limit comes from the pinned configuration and the reset from the
 * `tryAgainIn` the plugin computed. A lifetime quota (`USAGE_EXCEEDED`) has no
 * retry and no reset.
 */
function snapshotFromError(error: ApiKeyVerifyError | null | undefined, now = Date.now()): {
	snapshot: RateLimitSnapshot;
	retryAfterSeconds?: number;
} {
	const tryAgainInMs = Number(error?.details?.tryAgainIn);
	const hasRetry = Number.isFinite(tryAgainInMs) && tryAgainInMs > 0;
	const windowEnd = hasRetry ? now + tryAgainInMs : now;
	return {
		snapshot: {
			limit: AGENT_KEY_RATE_LIMIT.maxRequests,
			remaining: 0,
			reset: Math.ceil(windowEnd / 1000),
		},
		retryAfterSeconds: hasRetry ? retryAfterSeconds(tryAgainInMs) : undefined,
	};
}

function isRateLimited(error: ApiKeyVerifyError | null | undefined): boolean {
	return error?.code === "RATE_LIMITED" || error?.code === "USAGE_EXCEEDED";
}

export async function resolvePrincipal(c: Context<ApiEnv>): Promise<PrincipalResolution> {
	const auth = tokensAuthConfigured() ? await getTokensAuth(c.req.url, c.env) : null;
	if (!auth) {
		return {
			status: "ok",
			principal: {
				userId: c.req.header("x-user-id") || "default",
				scopes: new Set(ALL_SCOPES),
				via: "dev",
			},
		};
	}

	const bearer = bearerToken(c.req.header("authorization"));
	const apiKeyHeader = c.req.header("x-api-key");
	const apiKey = apiKeyHeader ?? (bearer?.startsWith(API_KEY_PREFIX) ? bearer : undefined);

	if (apiKey) {
		const result = await apiKeyApi(auth).verifyApiKey({ body: { key: apiKey } });
		if (!result.valid || !result.key) {
			if (isRateLimited(result.error)) {
				const { snapshot, retryAfterSeconds } = snapshotFromError(result.error);
				return { status: "rate_limited", rateLimit: snapshot, retryAfterSeconds };
			}
			return { status: "unauthenticated" };
		}
		return {
			status: "ok",
			principal: {
				userId: result.key.referenceId,
				scopes: scopesFromPermissions(result.key.permissions),
				via: "apiKey",
			},
			rateLimit: snapshotFromKey(result.key),
		};
	}

	if (!bearer) return { status: "unauthenticated" };

	// OAuth access token: JWT compact serialization (three parts). Anything
	// that fails verification falls through to the session branch below, which
	// is where opaque device-flow and mobile tokens land.
	if (oauthConfigured() && looksLikeJwt(bearer)) {
		const principal = await verifyOAuthAccessToken(c.req.url, bearer);
		if (principal) {
			return {
				status: "ok",
				principal: { userId: principal.userId, scopes: principal.scopes, via: "oauth" },
			};
		}
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) return { status: "unauthenticated" };
	return {
		status: "ok",
		principal: { userId: session.user.id, scopes: new Set(ALL_SCOPES), via: "session" },
	};
}

/** `X-RateLimit-*` for any response served by a key with a known budget. */
export function rateLimitHeaders(snapshot: RateLimitSnapshot): Record<string, string> {
	return {
		"x-ratelimit-limit": String(snapshot.limit),
		"x-ratelimit-remaining": String(snapshot.remaining),
		"x-ratelimit-reset": String(snapshot.reset),
	};
}

/**
 * 401 in the shape the MCP Streamable HTTP spec expects, pointing at the
 * resource metadata.
 *
 * The body also names the API-key alternative (#123 A.1): a client that stops
 * at the 401 otherwise never learns `elk_` keys exist, even though both header
 * transports accept them. A fresh key was proven to answer 200 on prelive, so
 * the hint is accurate. "Scoped Keys" is the name of the minting surface in
 * both iam deployments (#91); it is not called "API keys" any more.
 *
 * It also spells out the resource-metadata URL for the host that was called
 * (#126): telling a person on curl to "read the WWW-Authenticate header" is one
 * hop less useful than the URL itself, and the URL is host-derived, so prelive
 * and production each advertise their own.
 *
 * `code` is the machine-readable half (#140/#141): a client can branch on
 * "UNAUTHORIZED" without parsing the sentence, and the same field carries
 * "RATE_LIMITED" on the 429.
 *
 * The body must stay identical for "no credentials" and "wrong key": nothing
 * derived from the presented credential may reach it, or it becomes an oracle.
 */
export function unauthorizedResponse(requestUrl: string): Response {
	const origin = mcpAdvertisedOrigin(requestUrl);
	const resourceMetadata = `${origin}/.well-known/oauth-protected-resource`;
	return new Response(
		JSON.stringify({
			error: "unauthorized",
			code: "UNAUTHORIZED",
			message: "This endpoint needs credentials.",
			hint: `Send an API key as \`Authorization: Bearer elk_…\` or \`x-api-key: elk_…\` (mint one under Scoped Keys), or connect with browser sign-in by following ${resourceMetadata}.`,
		}),
		{
			status: 401,
			headers: {
				"content-type": "application/json",
				"www-authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
			},
		},
	);
}

/**
 * 429 for a key that is valid but out of budget (#140).
 *
 * Deliberately no `WWW-Authenticate`: this is not a credential failure, and a
 * challenge here would send an agent back down the sign-in path. The body
 * repeats the Retry-After number because a model that only reads the JSON
 * would otherwise invent one.
 */
export function rateLimitedResponse(snapshot: RateLimitSnapshot, retryAfter?: number): Response {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		...rateLimitHeaders(snapshot),
	};
	if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
	return new Response(
		JSON.stringify({
			error: "rate_limited",
			code: "RATE_LIMITED",
			message: "This API key is over its request budget.",
			hint:
				retryAfter !== undefined
					? `The key allows ${snapshot.limit} requests per window. Wait ${retryAfter} seconds (or until X-RateLimit-Reset) and retry — the key is valid, so do not rotate it.`
					: `The key allows ${snapshot.limit} requests per window and has none left. The key is valid, so do not rotate it.`,
			retryAfter: retryAfter ?? null,
			rateLimit: snapshot,
		}),
		{ status: 429, headers },
	);
}
