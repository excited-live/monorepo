/**
 * Prelive hostnames, in one place, for the config guards and the live smoke.
 *
 * The two API origins are NOT interchangeable:
 *
 *   - PRELIVE_API_ORIGIN is the public host clients call. MCP discovery
 *     advertises the request host (#116), so the webapp's `EXCITED_API_URL`
 *     must bind OAuth tokens to this origin or the API rejects every token on
 *     audience (#123 B).
 *   - PRELIVE_WORKER_ORIGIN is the Worker's own address. It stays the auth
 *     mount pin (`BETTER_AUTH_URL`) and the server-to-server BFF hop
 *     (`BACKEND_API_URL`); it must never be advertised to MCP clients.
 *
 * Changing a host means changing the Cloudflare project/route as well; the
 * guards exist so a half-done rename fails CI instead of an agent in the wild.
 */

export const PRELIVE_WEBAPP_ORIGIN = "https://prelive.excited.live"

export const PRELIVE_API_ORIGIN = "https://prelive.api.excited.live"

export const PRELIVE_WORKER_ORIGIN = "https://excited-live-api-prelive.preamza02.workers.dev"

/** No-BFF SPA (#88), named by both cross-origin allowlists. */
export const PRELIVE_IAM_ORIGIN = "https://excited-live-iam-prelive.pages.dev"

/** The OAuth authorization server: the webapp's `cookies` mount. */
export const PRELIVE_ISSUER = `${PRELIVE_WEBAPP_ORIGIN}/api/auth`
