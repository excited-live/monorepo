import { createAuth, type Auth, type AuthDatabase } from "@excited-live/auth"
import { isD1Database } from "../db/types"
import { resolveDbFile } from "../db"

/**
 * The API Better Auth instance (the `tokens` mount of packages/auth): bearer
 * sessions for native apps (Excited.Biz mobile), scoped API keys and the OAuth
 * provider surface for the future public API. No cookies cross this boundary.
 *
 * Database resolution mirrors src/db/index.ts so both layers always run on the
 * SAME database (user/session rows shared with the webapp cookies mount):
 *   1. a `DB` D1 binding on the runtime env — the Workers deploy path;
 *   2. otherwise the same local SQLite file (node:sqlite) — dev and tests.
 *
 * `baseURL` is required by the tokens mount (the OAuth provider derives its
 * issuer from it). BETTER_AUTH_URL wins when set; otherwise the incoming
 * request origin is used (dev convenience) and the cache is keyed on it so a
 * changed origin rebuilds instead of signing with a stale issuer.
 *
 * node:sqlite is imported dynamically with a computed specifier on purpose,
 * same as src/db/node-sqlite.ts: the Workers bundle (dist/worker.js) must
 * carry no Node builtin imports — the D1 branch is the deploy path.
 */

const SQLITE_MODULE = "node:sqlite"

/**
 * Cache for the NODE path only (dev server, tests): a long-lived process with
 * no per-request I/O context.
 *
 * It must never hold an instance built over a D1 binding. `betterAuth()` starts
 * its `init()` promise eagerly, inside whichever request called it first; on
 * Workers that request's I/O context is torn down when its response is sent, so
 * a promise it started and did not finish never settles, and every later
 * request in the isolate that awaits the cached instance hangs (#158: an
 * anonymous 401 on /api/v1/* or /mcp built the instance, then every sign-up and
 * get-session on that isolate hung at ~3 ms CPU).
 */
let cached: { key: string; auth: Auth } | null = null

export function tokensAuthConfigured(): boolean {
	return Boolean(process.env.BETTER_AUTH_SECRET)
}

/** Public origin for the request: BETTER_AUTH_URL override, else the request's own origin. */
export function requestOrigin(url: string): string {
	const override = process.env.BETTER_AUTH_URL
	if (override) return override.replace(/\/$/, "")
	const parsed = new URL(url)
	return `${parsed.protocol}//${parsed.host}`
}

async function resolveAuthDatabase(env: unknown): Promise<AuthDatabase> {
	const binding = (env as { DB?: unknown } | undefined)?.DB
	if (isD1Database(binding)) return { kind: "d1", database: binding }
	const { DatabaseSync: SqliteDatabase } = (await import(
		SQLITE_MODULE
	)) as typeof import("node:sqlite")
	return { kind: "node-sqlite", database: new SqliteDatabase(resolveDbFile(process.env)) }
}

/** Trusted origins for cross-origin auth calls (mobile origins, webapp origin). */
function trustedOrigins(): string[] {
	const configured = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean)
	return [
		...configured,
		"http://localhost:*",
		"http://127.0.0.1:*",
		"http://192.168.*:*",
		"http://10.*:*",
		"http://172.*:*",
		"tauri://localhost",
		"http://tauri.localhost",
	]
}

function googleProvider(): { clientId: string; clientSecret: string } | undefined {
	const clientId = process.env.BETTER_AUTH_GOOGLE_CLIENT_ID
	const clientSecret = process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET
	return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

/**
 * The tokens-mount auth instance for the given origin, or null when
 * BETTER_AUTH_SECRET is unset (unconfigured environments stay in mock/dev
 * mode — check tokensAuthConfigured() first).
 *
 * The baseURL carries the mount path (/api/v1/auth): Better Auth derives its
 * basePath from it, so the handler serves its endpoints under our router
 * instead of the default /api/auth.
 */
export async function getTokensAuth(requestUrl: string, env?: unknown): Promise<Auth | null> {
	const secret = process.env.BETTER_AUTH_SECRET
	if (!secret) return null
	const key = `${requestOrigin(requestUrl)}/api/v1/auth`
	const build = (database: AuthDatabase): Auth =>
		createAuth({
			database,
			secret,
			baseURL: key,
			trustedOrigins: trustedOrigins(),
			mount: "tokens",
			google: googleProvider(),
		})

	// Workers: one instance per call, owned by the calling request (see `cached`).
	const binding = (env as { DB?: unknown } | undefined)?.DB
	if (isD1Database(binding)) return build({ kind: "d1", database: binding })

	if (!cached || cached.key !== key) cached = { key, auth: build(await resolveAuthDatabase(env)) }
	return cached.auth
}

/** Drop the cached instance (tests reconfigure env between cases). */
export function resetTokensAuthCache(): void {
	cached = null
}
