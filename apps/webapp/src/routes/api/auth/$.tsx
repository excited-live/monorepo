import { createFileRoute } from "@tanstack/react-router"
import { getAuth } from "../../../lib/auth"
import { betterAuthConfigured } from "../../../lib/auth-config"

/**
 * Better Auth provider mount — the single catch-all every auth endpoint goes
 * through (sign-in/email, sign-up/email, sign-out, get-session, OAuth
 * callbacks, …). Replaces the three WorkOS routes (sign-in, callback,
 * sign-out) from the AuthKit integration.
 *
 * The guard exempts the whole /api/auth/ prefix (see start.ts) so the flow
 * stays reachable signed out. Returns 503 (not 404) when auth is not
 * configured so callers get a clear signal instead of route-not-found.
 */
export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => handle(request),
			POST: async ({ request }: { request: Request }) => handle(request),
		},
	},
})

async function handle(request: Request): Promise<Response> {
	if (!betterAuthConfigured()) {
		return new Response(JSON.stringify({ error: "auth not configured in this environment" }), {
			status: 503,
			headers: { "content-type": "application/json", "cache-control": "no-store" },
		})
	}
	return (await getAuth()).handler(request)
}
