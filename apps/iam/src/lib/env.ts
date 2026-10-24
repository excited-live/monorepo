/**
 * Build-time configuration. Vite inlines every `VITE_*` value, so this module
 * is the single place that knows which origin the browser talks to.
 *
 * The whole point of `apps/iam` is that there is no BFF: the values here are
 * absolute origins, never a relative `/api` path a server would proxy.
 */

const buildEnv = import.meta.env as unknown as Record<string, string | undefined>

function read(name: string, fallback = ""): string {
	const value = buildEnv[name]
	return typeof value === "string" && value.trim().length > 0 ? value.trim().replace(/\/+$/, "") : fallback
}

function hostEnvironment(hostname: string): string {
	if (hostname === "localhost" || hostname === "127.0.0.1") return "local"
	if (hostname.startsWith("prelive") || hostname.includes("prelive")) return "prelive"
	return "production"
}

const browserHost = typeof window === "undefined" ? "" : window.location.hostname

/** The single API origin — every REST and MCP request goes here. */
export const API_URL = read("VITE_API_URL", "http://localhost:8000")

/**
 * The OAuth authorization server origin (webapp's Better Auth cookies mount).
 * Consent and device approval are browser flows that belong to the AS, so they
 * POST against this origin. Empty means "same behaviour as local dev": iam
 * points those links at the API's own auth mount.
 */
export const AUTH_SERVER_URL = read("VITE_AUTH_SERVER_URL", API_URL)

/** Where the MCP streamable-HTTP endpoint lives. */
export const MCP_URL = read("VITE_MCP_URL", `${API_URL}/mcp`)

/** Human label for the topbar pill: local | prelive | production. */
export const ENV_LABEL = read("VITE_ENV_LABEL", hostEnvironment(browserHost))

/** Better Auth base paths for the two mounts (see packages/auth). */
export const API_AUTH_BASE_PATH = "/api/v1/auth"
export const AS_AUTH_BASE_PATH = "/api/auth"

/** True when the app was built without a usable API origin. */
export const CONFIG_MISSING = API_URL.length === 0
