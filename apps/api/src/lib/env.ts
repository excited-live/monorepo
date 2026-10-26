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
		BETTER_AUTH_TRUSTED_ORIGINS?: string
		API_CORS_ORIGINS?: string
	}
	Variables: {
		db: SqlDriver
		/** Verified user id (set only when auth is configured and the credential resolves). */
		userId?: string
		/**
		 * What the credential was: an `elk_` key, an OAuth access token, a Better
		 * Auth session, or the unconfigured-environment dev passthrough. Routes
		 * gate on it where a key must not be accepted (minting keys, editing the
		 * human's settings, #193).
		 */
		via?: "apiKey" | "oauth" | "session" | "dev"
		/** The principal's tool scopes, e.g. `accounting:read` (#193). */
		scopes?: Set<string>
	}
}
