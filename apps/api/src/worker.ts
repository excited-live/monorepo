import { createApp } from "./app"

/**
 * Cloudflare Workers entry point.
 *
 * Same app, same routes, same stores as the Node entry (`src/index.ts`) — the
 * only difference is that the platform provides the request env, where the D1
 * binding `DB` lives (see wrangler.toml). The persistence layer picks D1 up
 * automatically; no code change is needed between `node dist/index.js` and
 * `wrangler deploy`.
 *
 * Unlike the Node entry, the Worker fails closed: with BETTER_AUTH_SECRET unset
 * it answers 503 on /api/v1/* and /mcp rather than trusting `x-user-id`.
 */
const app = createApp({ requireAuthConfig: true })

export default {
	fetch: app.fetch,
}
