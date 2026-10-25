/**
 * OAuth discovery shims for the auth mount at /api/auth.
 *
 * RFC 8414 / OIDC discovery clients (the official MCP SDK, Claude Code) first
 * try the "path-insert" form of the metadata URL for an issuer that has a path:
 *   /.well-known/oauth-authorization-server/api/auth
 *   /.well-known/openid-configuration/api/auth
 * and abort when that answers 5xx. Better Auth serves the documents under
 * /api/auth/.well-known/…, so the path-insert URLs are rewritten onto it.
 */

const ISSUER_PATH = "/api/auth"
const DOCUMENTS = ["oauth-authorization-server", "openid-configuration"]

/** The in-mount URL for a path-insert discovery request, or null. */
export function pathInsertTarget(url: URL): URL | null {
	for (const doc of DOCUMENTS) {
		if (url.pathname === `/.well-known/${doc}${ISSUER_PATH}`) {
			const target = new URL(url)
			target.pathname = `${ISSUER_PATH}/.well-known/${doc}`
			return target
		}
	}
	return null
}

/** Rewrite a path-insert GET/HEAD onto the Better Auth mount; null when it is not one. */
export function rewritePathInsert(request: Request): Request | null {
	if (request.method !== "GET" && request.method !== "HEAD") return null
	const target = pathInsertTarget(new URL(request.url))
	return target ? new Request(target, request) : null
}

export function isWellKnownPath(pathname: string): boolean {
	return pathname.startsWith("/.well-known/")
}

/** A JSON 404 so discovery clients never see an HTML/5xx error page. */
export function wellKnownNotFound(): Response {
	return new Response(JSON.stringify({ error: "not_found" }), {
		status: 404,
		headers: { "content-type": "application/json", "cache-control": "no-store" },
	})
}

/** Pass a /.well-known/* response through unless it is an error that is not JSON. */
export function jsonWellKnownError(response: Response): Response {
	if (response.status < 400) return response
	if ((response.headers.get("content-type") ?? "").includes("json") && response.status < 500) return response
	return wellKnownNotFound()
}

function isLoopbackRedirect(uri: unknown): boolean {
	if (typeof uri !== "string") return false
	try {
		const { protocol, hostname } = new URL(uri)
		return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]")
	} catch {
		return false
	}
}

/**
 * Dynamic client registration: better-auth defaults application_type to "web",
 * which rejects http loopback redirect URIs. CLI MCP clients (MCP TS SDK,
 * Claude Code) register http://localhost:PORT/callback without an
 * application_type. When every redirect_uri is an http loopback URL and the
 * client did not choose a type, register it as "native" (RFC 7591 / OIDC DCR).
 * Anything else — including an explicit application_type — is untouched.
 */
export async function withNativeLoopbackDefault(request: Request): Promise<Request> {
	const url = new URL(request.url)
	if (request.method !== "POST" || url.pathname !== `${ISSUER_PATH}/oauth2/register`) return request
	const text = await request.clone().text()
	let body: unknown
	try {
		body = JSON.parse(text)
	} catch {
		return request
	}
	if (!body || typeof body !== "object" || Array.isArray(body)) return request
	const metadata = body as Record<string, unknown>
	const uris = metadata.redirect_uris
	if (metadata.application_type !== undefined) return request
	if (!Array.isArray(uris) || uris.length === 0 || !uris.every(isLoopbackRedirect)) return request
	const headers = new Headers(request.headers)
	headers.delete("content-length")
	return new Request(request.url, {
		method: request.method,
		headers,
		body: JSON.stringify({ ...metadata, application_type: "native" }),
	})
}
