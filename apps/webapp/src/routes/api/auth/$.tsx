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
			POST: async ({ request }: { request: Request }) => handle(request),
			OPTIONS: async ({ request }: { request: Request }) =>
				authCorsPreflight(request.headers.get("origin"), allowedOrigins()),
		},
	},
})

function allowedOrigins(): string[] {
	return parseAuthCorsOrigins(authEnv("AUTH_CORS_ORIGINS"))
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
