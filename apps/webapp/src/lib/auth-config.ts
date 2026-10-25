/**
 * Better Auth env gate. BETTER_AUTH_SECRET is the only required var; without
 * it the auth instance cannot be created, so environments without it (PR
 * previews, prelive, local mock work) render signed-out and skip all auth
 * wiring — same gate semantics as the WorkOS integration this replaces.
 *
 * The start callback is re-evaluated per request (TanStack Start
 * waitForRequest), so the check runs at request time and works on
 * workerd/Cloudflare Pages too. When unconfigured, we keep CSRF + locale and
 * log once per process.
 */
let authConfigWarned = false

export function authEnv(name: string): string | undefined {
	return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]
}

function envVar(name: string): string | undefined {
	return authEnv(name)
}

export function betterAuthConfigured(): boolean {
	const ok = Boolean(envVar("BETTER_AUTH_SECRET"))
	if (!ok && !authConfigWarned) {
		authConfigWarned = true
		console.warn("[auth] BETTER_AUTH_SECRET not set — Better Auth disabled for this environment (auth unavailable)")
	}
	return ok
}

/** Optional Google social login; both env vars must exist for it to wire up. */
export function googleProviderConfig(): { clientId: string; clientSecret: string } | undefined {
	const clientId = envVar("BETTER_AUTH_GOOGLE_CLIENT_ID")
	const clientSecret = envVar("BETTER_AUTH_GOOGLE_CLIENT_SECRET")
	return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

/**
 * MCP authorization-server settings (A2.1), wired only when both env vars the
 * flow needs exist:
 *
 *   - `BETTER_AUTH_URL` is the webapp origin. The OAuth provider derives its
 *     issuer from it, so it cannot be omitted (the instance would throw).
 *   - `EXCITED_API_URL` is the API origin. The `resource` registered for DCR
 *     clients and bound into access tokens is `<origin>/mcp`.
 *
 * Without them the OAuth/device plugins are not mounted; the rest of auth
 * (cookies, sign-in page) keeps working exactly as before.
 */
export function oauthProviderConfig(): {
	resource: string
	deviceVerificationUri: string
} | undefined {
	const webappUrl = envVar("BETTER_AUTH_URL")
	const apiUrl = envVar("EXCITED_API_URL")
	if (!webappUrl || !apiUrl) return undefined
	const webapp = webappUrl.replace(/\/+$/, "")
	const api = apiUrl.replace(/\/+$/, "")
	return {
		resource: `${api}/mcp`,
		deviceVerificationUri: `${webapp}/device`,
	}
}

/**
 * Absolute MCP endpoint shown on the signed-in launch home (#65).
 *
 * Uses the environment's API origin so prelive previews point at the prelive
 * API; falls back to the production API so a build without EXCITED_API_URL
 * still renders a usable address.
 */
export function mcpResourceUrl(): string {
	const api = envVar("EXCITED_API_URL")?.replace(/\/+$/, "") || "https://api.excited.live"
	return `${api}/mcp`
}

/**
 * Route gate (#46): the gate is production-only; prelive/previews/local leave
 * the flag unset so the app stays browsable.
 * True iff betterAuthConfigured() AND AUTH_REQUIRED is "true" or "1".
 * (Renamed from WORKOS_REQUIRE_AUTH in the Better Auth migration — enabling
 * the gate in an environment is an env change, not a code change.)
 */
export function authRequired(): boolean {
	if (!betterAuthConfigured()) return false
	const flag = envVar("AUTH_REQUIRED")
	return flag === "true" || flag === "1"
}
