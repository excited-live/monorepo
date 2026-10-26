import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "../../../lib/auth"
import { authEnv, betterAuthConfigured } from "../../../lib/auth-config"
import { withNativeLoopbackDefault } from "../../../lib/well-known"
import { authCorsPreflight, parseAuthCorsOrigins, withAuthCors } from "../../../lib/auth-cors"

/**
 * Better Auth provider mount — the single catch-all every auth endpoint goes
 * through (sign-in/email, sign-up/email, sign-out, get-session, OAuth
 * callbacks, …). Replaces the three WorkOS routes (sign-in, callback,
 * sign-out) from the AuthKit integration.
 *
 * The guard exempts the whole /api/auth/ prefix (see start.ts) so the flow
 * stays reachable signed out. Returns 503 (not 404) when auth is not
 * configured so callers get a clear signal instead of route-not-found.
 *
 * CORS: `apps/iam` (iam.excited.live) is a no-BFF SPA that calls this mount
 * cross-origin with credentials, so allowed origins from `AUTH_CORS_ORIGINS`
 * get an echo-origin response and an OPTIONS preflight. Same-origin callers
 * (the webapp itself) see exactly the previous behaviour.
 */
export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => handle(request),
			// Monitors, link checkers and `curl -I` probe with HEAD. Better Auth's
			// router has no HEAD route and answers 404, so dispatch HEAD as the GET
			// it mirrors and return the same status and headers with no body —
			// 200 when configured, 503 when not, never 404.
			HEAD: async ({ request }: { request: Request }) => withoutBody(await handle(asGet(request))),
			POST: async ({ request }: { request: Request }) => handle(request),
			OPTIONS: async ({ request }: { request: Request }) =>
				authCorsPreflight(request.headers.get("origin"), allowedOrigins()),
		},
	},
})

function allowedOrigins(): string[] {
	return parseAuthCorsOrigins(authEnv("AUTH_CORS_ORIGINS"))
}

/**
 * Show the auth mount a GET so HEAD gets the same answer the GET would.
 * Rebuild rather than `new Request(request, …)`: the SSR request may come from
 * another realm (vite dev / workerd) whose Request instances undici rejects.
 */
function asGet(request: Request): Request {
	const headers = new Headers()
	request.headers.forEach((value, key) => headers.set(key, value))
	return new Request(request.url, { method: "GET", headers })
}

/** Keep status, statusText and headers (including content-length, per RFC 9110) but send no body. */
function withoutBody(response: Response): Response {
	const headers = new Headers()
	response.headers.forEach((value, key) => headers.set(key, value))
	return new Response(null, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

async function handle(request: Request): Promise<Response> {
	const allowed = allowedOrigins()
	if (!betterAuthConfigured()) {
		return withAuthCors(
			new Response(JSON.stringify({ error: "auth not configured in this environment" }), {
				status: 503,
				headers: { "content-type": "application/json", "cache-control": "no-store" },
			}),
			request,
			allowed,
		)
	}
	return withAuthCors(await (await getAuth()).handler(await withNativeLoopbackDefault(request)), request, allowed)
}
