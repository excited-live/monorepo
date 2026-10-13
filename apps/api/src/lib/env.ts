import type { SqlDriver } from "../db/types"

/**
 * Hono environment for the API.
 *
 * Bindings: runtime-provided env (on Cloudflare Workers this is where the D1
 * binding `DB` shows up; in Node it is undefined and the resolver falls back
 * to the local SQLite file).
 * Variables: the per-request database driver set by the api middleware, and
 * the verified identity pinned by the Better Auth identity middleware.
 */
export interface ApiEnv {
	Bindings: {
		DB?: unknown
	}
	Variables: {
		db: SqlDriver
		/** Verified bearer-session user id (set only when auth is configured and the token resolves). */
		userId?: string
	}
}
