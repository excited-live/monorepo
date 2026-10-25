// Cloudflare Pages Function: SSR entry for the TanStack Start app
// 1) Serve static assets (images/css/js) via the ASSETS binding
// 2) Everything else goes through the SSR handler
import server from "../dist/server/server.js"
import { isWellKnownPath, jsonWellKnownError, rewritePathInsert } from "../src/lib/well-known"

// Paths that are always static. /assets is the Vite hashed-bundle dir;
// the rest are files published from apps/webapp/public/.
const STATIC_PREFIXES = ["/assets/", "/favicon", "/logo-", "/og-image", "/apple-touch-icon", "/public/"]

/**
 * Pages hands bindings to the Function as `context.env`, and `server.fetch()`
 * has no way to pass them on. `process.env` only ever carries text (vars and
 * secrets) — the runtime coerces anything written there to a string — so a D1
 * binding can never arrive that way, and the SSR code would fall through to
 * node:sqlite (unavailable on workerd) and throw on every request.
 *
 * Publishing the binding map on globalThis is the bridge the app reads
 * (`apps/webapp/src/lib/auth.ts` → `resolveAuthDatabase`). It is per isolate
 * and set before the handler runs on each request.
 */
export interface CloudflareEnv {
	ASSETS: { fetch: (req: Request) => Promise<Response> }
	DB?: unknown
	[name: string]: unknown
}

export const onRequest = async (context: {
	request: Request
	env: CloudflareEnv
}) => {
	;(globalThis as { __CF_ENV?: CloudflareEnv }).__CF_ENV = context.env

	// Fast path: only GET/HEAD are rendered by this app's router at request time
	const url = new URL(context.request.url)

	// Let static assets pass through untouched
	if (context.request.method === "GET" && STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
		const staticResp = await context.env.ASSETS.fetch(context.request)
		if (staticResp.status !== 404) return staticResp
	}

	// OAuth discovery: path-insert URLs map onto the auth mount, and any other
	// /.well-known/* error is a JSON 404 (an HTML 500 aborts MCP SDK discovery).
	const rewritten = rewritePathInsert(context.request)
	if (rewritten) return server.fetch(rewritten)
	if (isWellKnownPath(url.pathname)) return jsonWellKnownError(await server.fetch(context.request))

	return server.fetch(context.request)
}
