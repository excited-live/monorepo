/**
 * CORS for the Better Auth mount.
 *
 * `apps/iam` is a no-BFF SPA on its own origin (`iam.excited.live`) that talks
 * straight to the auth server — there is no server function or proxy in front
 * of it. A cross-origin `fetch` with `credentials: "include"` therefore needs
 * an explicit allow-list response: `Access-Control-Allow-Origin` must echo the
 * caller (never `*`, which browsers reject with credentials) and
 * `Access-Control-Allow-Credentials: true` must be present on both the
 * preflight and the real response.
 *
 * The origin list is configuration, not code: `AUTH_CORS_ORIGINS` on the
 * webapp (comma separated). Anything not on the list gets **no** CORS headers,
 * so the browser blocks it; the request itself still runs (same as today) so
 * first-party same-origin pages and server-to-server callers are unaffected.
 */

/** First-party browser origins allowed to call auth cross-origin. */
export const DEFAULT_AUTH_CORS_ORIGINS = [
	"https://iam.excited.live",
	// Local `apps/iam` dev server (VITE_PORT 5175) against `apps/webapp` (3000).
	"http://localhost:5175",
	"http://127.0.0.1:5175",
]

const ALLOWED_HEADERS = [
	"content-type",
	"authorization",
	"x-requested-with",
	// Better Auth sends its plugin state on these request headers.
	"x-better-auth",
	"x-better-auth-cookie",
].join(", ")

const EXPOSED_HEADERS = [
	// Better Auth returns a fresh bearer token here for API-key clients.
	"set-auth-token",
	"set-auth-jwt",
	"retry-after",
].join(", ")

/** Parse the comma-separated `AUTH_CORS_ORIGINS` value; empty entries collapse. */
export function parseAuthCorsOrigins(value: string | undefined | null): string[] {
	if (!value) return [...DEFAULT_AUTH_CORS_ORIGINS]
	const parsed = value
		.split(",")
		.map((entry) => entry.trim().replace(/\/+$/, ""))
		.filter(Boolean)
	return parsed.length > 0 ? parsed : [...DEFAULT_AUTH_CORS_ORIGINS]
}

/** Normalise an `Origin` header for comparison (trailing slash, case). */
function normalizeOrigin(origin: string): string {
	return origin.trim().replace(/\/+$/, "").toLowerCase()
}

/** True when this request may read the response from its origin. */
export function isAllowedOrigin(origin: string | null | undefined, allowed: string[]): boolean {
	if (!origin) return false
	const candidate = normalizeOrigin(origin)
	return allowed.some((entry) => normalizeOrigin(entry) === candidate)
}

/**
 * CORS response headers for one request. Empty object when the origin is not
 * allowed — no header means no browser access, which is the intent.
 */
export function authCorsHeaders(origin: string | null | undefined, allowed: string[]): Record<string, string> {
	if (!isAllowedOrigin(origin, allowed) || !origin) return {}
	return {
		"access-control-allow-origin": origin,
		"access-control-allow-credentials": "true",
		"access-control-expose-headers": EXPOSED_HEADERS,
		vary: "Origin",
	}
}

/** 204 preflight response for an allowed origin; 403 when it is not allowed. */
export function authCorsPreflight(origin: string | null | undefined, allowed: string[]): Response {
	const headers = authCorsHeaders(origin, allowed)
	if (Object.keys(headers).length === 0) {
		return new Response(null, { status: 403 })
	}
	return new Response(null, {
		status: 204,
		headers: {
			...headers,
			"access-control-allow-methods": "GET, POST, OPTIONS",
			"access-control-allow-headers": ALLOWED_HEADERS,
			"access-control-max-age": "600",
		},
	})
}

/**
 * Copy the response and add CORS headers when the caller is allowed.
 *
 * The body/status are untouched, and an immutable provider response (Better
 * Auth may hand back a `Response` with immutable headers) is rebuilt rather
 * than mutated.
 */
export function withAuthCors(
	response: Response,
	request: Request,
	allowed: string[],
): Response {
	const headers = authCorsHeaders(request.headers.get("origin"), allowed)
	if (Object.keys(headers).length === 0) return response
	const merged = new Headers(response.headers)
	for (const [name, value] of Object.entries(headers)) merged.set(name, value)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: merged,
	})
}
