import { createAuth, type Auth, type AuthD1DatabaseLike, type AuthDatabase } from "@excited-live/auth"
import { tanstackStartCookies } from "@excited-live/auth/tanstack-start"
import { authEnv, betterAuthConfigured, googleProviderConfig, oauthProviderConfig } from "./auth-config"
import path from "node:path"

/**
 * The webapp Better Auth instance (the `cookies` mount of packages/auth).
 *
 * Database resolution, in order:
 *   1. a `DB` D1 binding visible on process.env — the Cloudflare Pages deploy
 *      path (bindings land on process.env under nodejs_compat). It must point
 *      at the SAME D1 database as apps/api so user/session rows are shared.
 *   2. otherwise a local SQLite file via node:sqlite — dev and tests.
 *
 * The instance is cached per process/isolate; the binding lookup runs at first
 * request time (module-load time is too early on Pages).
 */

const DEFAULT_DB_FILE = ".data/auth.sqlite"

let cached: Auth | null = null

function isD1Binding(value: unknown): value is AuthD1DatabaseLike {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { prepare?: unknown }).prepare === "function" &&
		typeof (value as { exec?: unknown }).exec === "function"
	)
}

/**
 * The `DB` D1 binding, if this process has one.
 *
 * On Cloudflare Pages it is NOT on `process.env`: the runtime populates that
 * only with text (vars and secrets) and stringifies anything else, so a D1
 * binding is never there. `functions/[[path]].ts` publishes the binding map on
 * `globalThis` before rendering; local dev and tests keep using process.env.
 */
function d1Binding(): AuthD1DatabaseLike | undefined {
	const fromProcessEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env?.DB
	if (isD1Binding(fromProcessEnv)) return fromProcessEnv
	const fromPages = (globalThis as { __CF_ENV?: Record<string, unknown> }).__CF_ENV?.DB
	if (isD1Binding(fromPages)) return fromPages
	return undefined
}


async function resolveAuthDatabase(): Promise<AuthDatabase> {
	const binding = d1Binding()
	if (binding) return { kind: "d1", database: binding }
	// Literal dynamic imports: rolldown (vite) externalizes node builtins. The
	// computed-specifier workaround in apps/api is esbuild-specific.
	const { mkdirSync } = (await import("node:fs")) as typeof import("node:fs")
	const file = process.env.EXCITED_WEBAPP_AUTH_DB || DEFAULT_DB_FILE
	mkdirSync(path.dirname(file), { recursive: true })
	const { DatabaseSync: SqliteDatabase } = (await import("node:sqlite")) as typeof import("node:sqlite")
	return { kind: "node-sqlite", database: new SqliteDatabase(file) }
}

export async function getAuth(): Promise<Auth> {
	if (!betterAuthConfigured()) {
		throw new Error("[auth] getAuth() called without BETTER_AUTH_SECRET — check betterAuthConfigured() first")
	}
	cached ??= await createAuthAsync()
	return cached
}

async function createAuthAsync(): Promise<Auth> {
	const oauth = oauthProviderConfig()
	return createAuth({
		database: await resolveAuthDatabase(),
		secret: authEnv("BETTER_AUTH_SECRET")!,
		baseURL: authEnv("BETTER_AUTH_URL") || undefined,
		mount: "cookies",
		// The TanStack Start cookie bridge lives on its own subpath so the API
		// (tokens mount, Workers bundle) never inherits the framework runtime.
		cookiesPlugin: tanstackStartCookies(),
		google: googleProviderConfig(),
		oauth: oauth
			? {
					resource: oauth.resource,
					deviceVerificationUri: oauth.deviceVerificationUri,
				}
			: undefined,
	})
}

/** Test hook: drop the cached instance (tests reconfigure env between cases). */
export function resetAuthCache(): void {
	cached = null
}
