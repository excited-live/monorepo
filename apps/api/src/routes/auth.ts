import { Hono, type MiddlewareHandler } from "hono";
import type { ApiEnv } from "../lib/env";
import { getTokensAuth, tokensAuthConfigured } from "../lib/auth";

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
	router.get("/me", async (c) => {
		const auth = await getTokensAuth(c.req.url, c.env);
		if (!auth) {
			return c.json({ error: "auth not configured in this environment" }, 503);
		}
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		return c.json({
			authenticated: true,
			user: { id: session.user.id, email: session.user.email, name: session.user.name },
		});
	});

	// Everything else: the Better Auth provider surface itself.
	router.on(["GET", "POST"], "*", async (c) => {
		const auth = await getTokensAuth(c.req.url, c.env);
		if (!auth) {
			return c.json({ error: "auth not configured in this environment" }, 503);
		}
		return auth.handler(c.req.raw);
	});

	return router;
}

/**
 * Identity middleware for /api/v1/* (excluding the auth surface itself).
 *
 * - Auth configured: identity comes ONLY from a valid Bearer token (mobile
 *   token, or the session token the webapp BFF forwards). Requests without
 *   one get 401 — the x-user-id trust hole from the mock era is gone.
 * - Auth NOT configured (prelive, previews, local): x-user-id passthrough as
 *   before, so mock/dev flows keep working.
 */
export function createIdentityMiddleware(): MiddlewareHandler<ApiEnv> {
	return async (c, next) => {
		if (!tokensAuthConfigured()) {
			await next();
			return;
		}
		// The auth surface itself must stay reachable unauthenticated (sign-in,
		// sign-up, OAuth metadata…).
		if (c.req.path.startsWith("/api/v1/auth/")) {
			await next();
			return;
		}
		const authHeader = c.req.header("authorization");
		const auth = await getTokensAuth(c.req.url, c.env);
		const session =
			auth && authHeader?.toLowerCase().startsWith("bearer ")
				? await auth.api.getSession({ headers: c.req.raw.headers })
				: null;
		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		c.set("userId", session.user.id);
		await next();
	};
}
