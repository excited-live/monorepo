import { Hono, type MiddlewareHandler } from "hono";
import type { ApiEnv } from "../lib/env";
import { jsonResponse, route } from "../openapi/docs";
import { ErrorSchema } from "../openapi/schemas";
import { z } from "zod";
import { getTokensAuth, tokensAuthConfigured } from "../lib/auth";
import { resolvePrincipal } from "../lib/principal";
import { rateLimitHeaders, rateLimitedResponse } from "../modules/mcp/mcp.auth";

/**
 * What each `/api/v1` route needs from the credential (#193).
 *
 * The table lives here, in the one middleware that can see both the path and
 * the resolved principal. A route missing from it is treated as
 * `sessionOnly`: fail closed, because a new route that accepts keys by
 * accident is a privilege escalation nobody wrote a test for.
 *
 * - `scope` — a read method needs `read`, any other method needs `write`.
 * - `sessionOnly` — only a browser session or the dev passthrough. An API key
 *   or OAuth token is 403 `session_required`, never 401.
 * - `anyCredential` — any valid credential; only `/me`, which describes the
 *   credential itself.
 */
type RouteScope =
	| { kind: "scope"; read: string; write: string }
	| { kind: "sessionOnly" }
	| { kind: "anyCredential" };

/** Methods that read. Everything else is treated as a write. */
const METHOD_READS = new Set(["GET", "HEAD", "OPTIONS"]);

const SESSION_ONLY: RouteScope = { kind: "sessionOnly" };

function routeScope(path: string): RouteScope {
	// `agent-keys` matters most: a key that can mint keys is self-replicating.
	// `settings` is the human's account, which no advertised scope covers.
	if (path === "/api/v1/agent-keys" || path.startsWith("/api/v1/agent-keys/")) return SESSION_ONLY;
	if (path === "/api/v1/settings" || path.startsWith("/api/v1/settings/")) return SESSION_ONLY;
	// Any valid credential may ask what it is (this is the issue's repro).
	if (path === "/api/v1/auth/me") return { kind: "anyCredential" };
	// The catalog only suggests and resolves presets — a read in both
	// directions even though `resolve` is a POST.
	if (path === "/api/v1/catalog" || path.startsWith("/api/v1/catalog/")) {
		return { kind: "scope", read: "accounting:read", write: "accounting:read" };
	}
	if (path.startsWith("/api/v1/accounting")) {
		return { kind: "scope", read: "accounting:read", write: "accounting:write" };
	}
	if (path.startsWith("/api/v1/onboarding")) {
		return { kind: "scope", read: "onboarding:read", write: "onboarding:write" };
	}
	return SESSION_ONLY;
}

/**
 * Better Auth tokens mount (packages/auth, mount: "tokens").
 *
 * Replaces the WorkOS AuthKit exchange + unsigned `biz_tok_` mock from the
 * pre-migration API. The Better Auth handler serves the whole surface under
 * /api/v1/auth/*: sign-up/email, sign-in/email, sign-out, get-session, API
 * keys, and (future) the OAuth provider endpoints. With the bearer() plugin
 * enabled, a sign-in request that carries an `Authorization: Bearer` header
 * gets the session token back in the `set-auth-token` response header — that
 * is how native apps (excited.live mobile) obtain their token without a
 * browser flow.
 */
export function createAuthRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	// Convenience session check for native apps: 200 + user, 401 without a
	// valid Bearer token, 503 when auth is not configured in this environment.
	router.get("/me", route({
		tags: ["Auth"],
		operationId: "getMe",
		summary: "Current session",
		description:
			"The credential behind this request and the user it belongs to. `via` says which one it was: `apiKey` for an `elk_` key (`x-api-key` or `Authorization: Bearer elk_…`), `oauth` for an OAuth access token, `session` for a signed-in session token. Any valid credential may call it, so this is the one route an agent key can reach before it holds a scope (#193).",
		responses: {
			200: jsonResponse("Authenticated.", z.object({
				authenticated: z.literal(true),
				via: z.enum(["apiKey", "oauth", "session", "dev"]),
				user: z.object({ id: z.string(), email: z.string(), name: z.string() }),
			})),
			401: jsonResponse("No valid credential.", ErrorSchema),
			503: jsonResponse("Auth is not configured in this environment.", ErrorSchema),
		},
	}), async (c) => {
		const auth = await getTokensAuth(c.req.url, c.env);
		if (!auth) {
			return c.json({ error: "auth not configured in this environment" }, 503);
		}
		// Identity comes from the shared resolver through the /api/v1 identity
		// middleware (#193), so an `elk_` key answers here too. Calling
		// `auth.api.getSession` here directly is what used to 401 every key.
		const userId = c.get("userId");
		if (!userId) {
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" as const }, 401);
		}
		const user = await c.get("db").first<{ email: string; name: string }>(
			'SELECT email, name FROM "user" WHERE id = ?',
			[userId],
		);
		if (!user) {
			// A key whose owner row is gone: the credential verified but names
			// nobody, which is indistinguishable from a bad credential to a client.
			return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" as const }, 401);
		}
		return c.json({
			authenticated: true as const,
			via: c.get("via") ?? "session",
			user: { id: userId, email: user.email, name: user.name },
		});
	});

	// Everything else: the Better Auth provider surface itself.
	router.on(["GET", "POST"], "*", async (c) => {
		const auth = await getTokensAuth(c.req.url, c.env);
		if (!auth) {
			return c.json({ error: "auth not configured in this environment" }, 503);
		}
		let reqToHandle = c.req.raw;
		if (c.req.method !== "GET" && c.req.method !== "HEAD") {
			const bodyText = await c.req.text().catch(() => "");
			console.log(`[auth request] ${c.req.method} ${c.req.path} bodyLen=${bodyText.length} preview=${JSON.stringify(bodyText.slice(0, 80))}`);
			const headers = new Headers(c.req.raw.headers);
			reqToHandle = new Request(c.req.raw.url, {
				method: c.req.method,
				headers,
				body: bodyText,
				// @ts-expect-error duplex is standard in Node fetch
				duplex: "half",
			});
		}
		const res = await auth.handler(reqToHandle);
		if (res.status >= 400) {
			try {
				const clone = res.clone();
				const text = await clone.text();
				console.warn(`[auth error ${res.status}] ${c.req.method} ${c.req.path} -> ${text}`);
			} catch {
				// ignore
			}
		}
		return res;
	});

	return router;
}

/**
 * Identity + scope gate for /api/v1/* (excluding the auth provider surface).
 *
 * One resolver, two transports (#193): this middleware now calls the same
 * `resolvePrincipal` `/mcp` calls, so an `elk_` key that works on `/mcp` works
 * here instead of getting 401. Accepting keys is only safe because the same
 * middleware enforces scopes — REST had no scope check anywhere before, so
 * without the gate an `onboarding`-only key could read and write
 * `/api/v1/accounting/*` while `/mcp` refused the identical call.
 *
 * - Auth configured: identity comes from `resolvePrincipal` (key, OAuth token,
 *   or session). No credential → 401. A valid key over budget → 429 with the
 *   same body `/mcp` sends, because it is the same key's budget.
 * - Auth NOT configured (previews, local): x-user-id passthrough as before, so
 *   mock/dev flows keep working.
 */
export function createIdentityMiddleware(): MiddlewareHandler<ApiEnv> {
	return async (c, next) => {
		if (!tokensAuthConfigured()) {
			await next();
			return;
		}
		// The auth provider surface must stay reachable unauthenticated
		// (sign-in, sign-up, OAuth metadata…); it checks its own credentials.
		// `/me` is deliberately NOT exempt: naming the caller is its whole job,
		// and exempting it is what left it 401-ing every API key (#193).
		if (c.req.path.startsWith("/api/v1/auth/") && c.req.path !== "/api/v1/auth/me") {
			await next();
			return;
		}

		const resolved = await resolvePrincipal(c);
		if (resolved.status === "unauthenticated") {
			// The same body for "no credential" and "wrong credential": nothing
			// derived from what was presented may reach it, or it is an oracle.
			// The string and `UNAUTHORIZED` are REST's own, not MCP's lowercase
			// `unauthorized` — clients compare it.
			return c.json(
				{
					error: "Unauthorized",
					code: "UNAUTHORIZED" as const,
					hint: "Send an API key as `Authorization: Bearer elk_…` or `x-api-key: elk_…`, or a session token from /api/v1/auth/sign-in/email.",
				},
				401,
			);
		}
		if (resolved.status === "rate_limited") {
			// The MCP 429 verbatim: same key, same budget, same recovery advice.
			return rateLimitedResponse(resolved.rateLimit, resolved.retryAfterSeconds);
		}

		const principal = resolved.principal;
		c.set("userId", principal.userId);
		c.set("via", principal.via);
		c.set("scopes", principal.scopes);

		const rule = routeScope(c.req.path);
		// A session (or the unconfigured dev passthrough) is the human at the
		// keyboard. Keys and OAuth tokens are programs, and two surfaces are
		// outside every scope we advertise.
		const isSession = principal.via === "session" || principal.via === "dev";
		if (rule.kind === "sessionOnly" && !isSession) {
			return c.json(
				{
					error: "Forbidden",
					code: "session_required" as const,
					message:
						"This route needs a browser sign-in session and refuses API keys. A key that can mint keys is self-replicating, and editing the account holder's settings is not inside any scope the API advertises.",
				},
				403,
			);
		}
		if (rule.kind === "scope") {
			const needed = METHOD_READS.has(c.req.method.toUpperCase()) ? rule.read : rule.write;
			if (!principal.scopes.has(needed)) {
				// 403, not 401: the credential is valid, it just cannot do this.
				// A 401 would send the agent to rotate a key it should keep.
				return c.json(
					{
						error: "Forbidden",
						code: "insufficient_scope" as const,
						requiredScope: needed,
						message: `This credential does not hold the ${needed} scope.`,
					},
					403,
				);
			}
		}

		await next();

		// Only key responses carry a budget, and only when the key has one.
		if (principal.via === "apiKey" && resolved.rateLimit) {
			const headers = new Headers(c.res.headers);
			for (const [name, value] of Object.entries(rateLimitHeaders(resolved.rateLimit))) {
				headers.set(name, value);
			}
			c.res = new Response(c.res.body, {
				status: c.res.status,
				statusText: c.res.statusText,
				headers,
			});
		}
	};
}
