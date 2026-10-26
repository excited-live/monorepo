import type { MiddlewareHandler } from "hono"
import { cors } from "hono/cors"
import type { ApiEnv } from "./env"

/** Dev-only browser origins (webapp 3000, iam 5175); never allowed when `requireAuthConfig` is on. */
const LOCAL_DEV_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:5175",
	"http://127.0.0.1:5175",
]

function normalize(origin: string): string {
	return origin.trim().replace(/\/+$/, "").toLowerCase()
}

function parseList(value: string | undefined | null): string[] {
	if (!value) return []
	return value
		.split(",")
		.map(normalize)
		.filter((entry) => entry !== "" && entry !== "null" && entry !== "*")
}

/**
 * Browser origins allowed to call the API with credentials.
 *
 * Read from the same `BETTER_AUTH_TRUSTED_ORIGINS` the auth layer already
 * trusts (so there is one list per environment), plus optional
 * `API_CORS_ORIGINS`. Localhost is added only outside the deployed Worker.
 * `null` and `*` are never allowed.
 */
export function resolveCorsOrigins(
	env: { BETTER_AUTH_TRUSTED_ORIGINS?: string; API_CORS_ORIGINS?: string } | undefined,
	options: { allowLocalhost: boolean },
): string[] {
	const read = (key: "BETTER_AUTH_TRUSTED_ORIGINS" | "API_CORS_ORIGINS") => env?.[key] ?? process.env[key]
	const list = [...parseList(read("BETTER_AUTH_TRUSTED_ORIGINS")), ...parseList(read("API_CORS_ORIGINS"))]
	if (options.allowLocalhost) list.push(...LOCAL_DEV_ORIGINS)
	return [...new Set(list)]
}

/**
 * Explicit-allowlist CORS. A disallowed (or `null`) Origin gets no CORS headers,
 * so browsers block it; requests without an Origin (MCP clients, curl, server to
 * server) are untouched.
 */
export function corsAllowlist(options: { allowLocalhost: boolean }): MiddlewareHandler<ApiEnv> {
	return async (c, next) => {
		const allowed = resolveCorsOrigins(c.env, options)
		const requested = c.req.header("origin") ?? ""
		const permitted = requested !== "" && allowed.includes(normalize(requested))
		const handler = cors({
			origin: () => (permitted ? requested : null),
			allowHeaders: ["Content-Type", "Authorization", "x-user-id", "x-api-key", "Mcp-Protocol-Version", "Mcp-Session-Id"],
			exposeHeaders: ["set-auth-token"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			// Decide credentials per request: Hono adds allow-credentials
			// unconditionally and merges its own headers back onto the final
			// Response, so a refused origin cannot be cleaned up afterwards —
			// it must never be set in the first place. A refused origin, including
			// on OPTIONS preflight, now gets no CORS headers at all.
			credentials: permitted,
		})
		return handler(c, next)
	}
}
