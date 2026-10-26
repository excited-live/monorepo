/**
 * Public destinations the iam UI links to (#127).
 *
 * Nothing here is an absolute *app* origin: every in-app link is a TanStack
 * `Link` to a hub route, because iam's session is a localStorage bearer token
 * minted by `/sign-in` against the API. An `https://auth.excited.live/...`
 * href leaves the app and signs the visitor into the webapp instead, so they
 * come back still signed out of iam.
 *
 * The one real cross-origin host is the marketing site (landing + `/docs`),
 * which varies by environment — see `DOCS_ORIGIN` in `env.ts`.
 */
import { DOCS_ORIGIN } from "./env"

/** Marketing site docs hub — the landing deployment for this environment. */
export const DOCS_URL = `${DOCS_ORIGIN}/docs`

/** The page titled "Connect your agent over MCP". */
export const MCP_GUIDE_URL = `${DOCS_URL}/mcp`

/** Public source repository for the "Open source" card. */
export const GITHUB_URL = "https://github.com/fromsukong/excited.live"
