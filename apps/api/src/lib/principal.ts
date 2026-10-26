import { AGENT_KEY_RATE_LIMIT, apiKeyApi, type ApiKeyRecord, type ApiKeyVerifyError } from "@excited-live/auth";
import type { Context } from "hono";
import type { ApiEnv } from "./env";
import { getTokensAuth, tokensAuthConfigured } from "./auth";
import { looksLikeJwt, oauthConfigured, verifyOAuthAccessToken } from "./oauth";
import { ALL_SCOPES, scopesFromPermissions } from "./scopes";

/**
 * The one principal resolver, shared by `/mcp` and `/api/v1/*` (#193).
 *
 * It lived in `modules/mcp/mcp.auth.ts` while only MCP accepted API keys. REST
 * then grew a second, weaker resolver (`routes/auth.ts` identity middleware)
 * that only understood Bearer sessions, so an agent key that worked on `/mcp`
 * got 401 on every REST route — while `openapi.json` advertised both. The
 * duplication was the bug: one credential must resolve the same way on both
 * surfaces, or one of them silently refuses it.
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
 *   5. Anything else → `unauthenticated` (the caller answers 401 +
 *      WWW-Authenticate on `/mcp`).
 *
 * A key over its request budget is its own outcome (`rate_limited` → 429 +
 * Retry-After), never a 401 (#140): agents treat 401 as "credential is wrong,
 * stop and rotate", which burns a second key instead of waiting.
 */

export type PrincipalVia = NonNullable<ApiEnv["Variables"]["via"]>;

export interface Principal {
	userId: string;
	scopes: Set<string>;
	via: PrincipalVia;
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
	| { status: "ok"; principal: Principal; rateLimit?: RateLimitSnapshot }
	| { status: "unauthenticated" }
	| {
			status: "rate_limited";
			rateLimit: RateLimitSnapshot;
			/** Seconds until the window resets; absent when the cap never resets. */
			retryAfterSeconds?: number;
	  };

/** The `elk_` prefix is set by packages/auth's apiKey configuration. */
export const API_KEY_PREFIX = "elk_";

function bearerToken(header: string | undefined): string | undefined {
	if (!header) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match?.[1]?.trim() || undefined;
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
