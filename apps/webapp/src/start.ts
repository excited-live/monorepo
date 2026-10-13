/**
 * Start instance — wires global request middleware.
 *
 * Middleware order matters:
 * 1. `localeMiddleware` — resolves the request locale (existing behavior, unchanged).
 * 2. `csrfMiddleware` — rejects cross-site requests to server-function RPC
 *    endpoints. Defining our own start instance opts us out of TanStack's
 *    built-in CSRF protection, so we re-add it explicitly. It must run before
 *    the auth middleware so cross-site requests are rejected before any
 *    session work happens.
 * 3. `betterAuthMiddleware` — resolves the Better Auth cookie session
 *    (packages/auth, cookies mount) and exposes `{ user }` to server functions
 *    and route loaders via the middleware context.
 * 4. `authGuardMiddleware` — route gate (#46): redirects signed-out page
 *    requests to /sign-in when auth is required (AUTH_REQUIRED). Must run
 *    after betterAuthMiddleware so the session is already resolved.
 *
 * The locale middleware resolves the request locale once per request:
 * 1. `excited_live_locale` cookie (visitor's explicit choice),
 * 2. `Accept-Language` header (first supported language),
 * 3. default `en`.
 * It sets the cookie on first visit so the client can re-derive the same
 * locale after hydration, and exposes it to routes via `serverContext`.
 */
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import {
	localeCookieValue,
	localeFromAcceptLanguage,
	localeFromCookie,
	type Locale,
} from "@excited-live/i18n"
import { routeTree } from "./routeTree.gen"
import { betterAuthConfigured, authRequired } from "./lib/auth-config"
import { getAuth } from "./lib/auth"

const localeMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
	const request = getRequest()
	const cookieLocale = localeFromCookie(request.headers.get("cookie"))
	const locale: Locale = cookieLocale ?? localeFromAcceptLanguage(request.headers.get("accept-language")) ?? "en"
	const setCookieNeeded = cookieLocale === undefined && locale !== "en"

	const response = await next({ context: { locale } })

	if (setCookieNeeded) {
		// The middleware result should carry a real Response; guard anyway so a
		// failure to persist the cookie can never break rendering.
		try {
			const inner = (response as { response?: Response }).response
			inner?.headers?.append("set-cookie", localeCookieValue(locale, { secure: true }))
		} catch (error) {
			console.error("[i18n] failed to set locale cookie", error)
		}
	}

	return response
})

// Reject cross-site requests to server-function RPC endpoints (header check on
// Sec-Fetch-Site / Origin / Referer; no tokens, no interaction with the
// session cookie).
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
})

/**
 * Resolves the Better Auth session per request and exposes it downstream:
 * `context.auth = { user }` (null when signed out). Registered ONLY when
 * betterAuthConfigured() is true. Server functions that need the session can
 * also call auth.api.getSession directly (see lib/auth.ts + _layout.tsx).
 */
const betterAuthMiddleware = createMiddleware({ type: "request" }).server(async ({ next, request }) => {
	const session = await (await getAuth()).api.getSession({ headers: request.headers })
	return next({ context: { auth: { user: session?.user ?? null } } })
})

/**
 * Route gate (#46): when auth is required (see lib/auth-config.ts), signed-out
 * PAGE requests are redirected into our /sign-in page. Only registered after
 * betterAuthMiddleware, and only when configured + required.
 *
 * This is a PAGE-LEVEL gate only: server-function RPCs are intentionally not
 * gated (getAuthState must stay callable while signed out). Any future server
 * function that touches user data must check the session itself — the
 * AUTH_REQUIRED flag does not cover server functions.
 */

/**
 * Paths that must stay reachable while signed out.
 *
 * - `/sign-in` is the sign-in page itself (exact path).
 * - `/api/auth/` is the Better Auth provider mount (the `/api/auth/$` catch-all
 *   and every endpoint it serves: sign-in/email, sign-out, get-session,
 *   OAuth callbacks, …). The whole prefix is the auth flow by construction, so
 *   unlike the WorkOS exact-path set this is a deliberate prefix exemption —
 *   anything mounted there is part of the provider surface.
 */
const PUBLIC_AUTH_PATHS = { exact: new Set(["/sign-in"]), prefix: "/api/auth/" }

// Static file shapes (missing /favicon.ico, /robots.txt, …) pass through so
// they render their normal 404 instead of a sign-in bounce. Strict extension
// allowlist on purpose — a dotted route segment (e.g. /user/john.doe) must
// stay gated, so do NOT widen this to "contains a dot".
const STATIC_FILE_EXTENSION_RE = /\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?|txt|xml|map)$/i

/** The session shape betterAuthMiddleware puts into the context (read defensively). */
interface GuardAuthContext {
	user?: unknown
}

const authGuardMiddleware = createMiddleware({ type: "request" }).server(
	async ({ next, request, context, pathname, handlerType }) => {
		// Page/router requests only — see the gate comment above.
		if (handlerType !== "router") return next()
		if (PUBLIC_AUTH_PATHS.exact.has(pathname) || pathname.startsWith(PUBLIC_AUTH_PATHS.prefix)) return next()
		const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1)
		if (STATIC_FILE_EXTENSION_RE.test(lastSegment)) return next()

		// betterAuthMiddleware merges `{ auth: { user } }` into the downstream
		// middleware context before this middleware runs — read it by shape
		// (middleware context is untyped across the chain boundary).
		const guard: GuardAuthContext | undefined = (context as { auth?: GuardAuthContext } | undefined)?.auth
		if (typeof guard !== "object" || guard === null || !("user" in guard)) {
			// Unreachable when the guard is registered correctly (it only mounts
			// alongside betterAuthMiddleware). Fail closed rather than silently
			// disengaging the gate.
			console.error("[auth] guard: auth context missing — refusing request")
			return new Response("Auth is misconfigured", {
				status: 503,
				headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
			})
		}
		if (guard.user) return next()

		// Preserve the full target (path + query) so deep links survive sign-in.
		const url = new URL(request.url)
		const returnPathname = encodeURIComponent(url.pathname + url.search)
		return new Response(null, {
			status: 307,
			headers: {
				location: `/sign-in?returnPathname=${returnPathname}`,
				"cache-control": "no-store",
			},
		})
	},
)

export const startInstance = createStart(async () => {
	const configured = betterAuthConfigured()
	return {
		requestMiddleware: [
			localeMiddleware,
			csrfMiddleware,
			...(configured ? [betterAuthMiddleware] : []),
			...(configured && authRequired() ? [authGuardMiddleware] : []),
		],
		router: {
			routeTree,
		},
	}
})
