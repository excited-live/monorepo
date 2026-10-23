import { applyMigrations } from "./apply"
import { createD1Driver } from "./d1"
import { createNodeSqliteDriver } from "./node-sqlite"
import { isD1Database, type SqlDriver } from "./types"

/**
 * Persistence backend resolution.
 *
 * Order:
 *   1. a D1 binding on the runtime env (`c.env.DB`) — the deploy path, and
 *      what `wrangler dev` provides locally;
 *   2. otherwise the local SQLite file (node:sqlite) — dev and tests.
 *
 * Both are SQLite running the same migrations, so there is one set of SQL and
 * one set of store code behind either choice.
 */

export type DbMode = SqlDriver["kind"]

export interface ResolvedDb {
	driver: SqlDriver
	mode: DbMode
	/** Where the data lives — D1 binding name, or the SQLite file path. */
	location: string
	/** Migration files applied during this boot (empty when already current). */
	migrations: string[]
}

/** Default local database file, relative to the process working directory. */
export const DEFAULT_DB_FILE = ".data/excited-live.sqlite"

/** Env var overriding the local SQLite file path. */
export const DB_FILE_ENV = "EXCITED_API_DB_PATH"

/** Set to "0" to skip boot-time migrations (e.g. when wrangler owns them). */
export const AUTO_MIGRATE_ENV = "EXCITED_API_AUTO_MIGRATE"

export function resolveDbFile(env: Record<string, string | undefined> = process.env): string {
	return env[DB_FILE_ENV] || DEFAULT_DB_FILE
}

export function autoMigrateEnabled(env: Record<string, string | undefined> = process.env): boolean {
	return env[AUTO_MIGRATE_ENV] !== "0"
}

/**
 * Build a resolved database (and apply pending migrations) for the given
 * runtime env. Exported for tests and for the standalone proof script.
 *
 * `skipMigrations` lets a caller that already proved the schema current skip
 * the ledger read.
 */
export async function resolveDb(
	env?: unknown,
	processEnv: Record<string, string | undefined> = process.env,
	options: { skipMigrations?: boolean } = {},
): Promise<ResolvedDb> {
	const binding =
		typeof env === "object" && env !== null ? (env as { DB?: unknown }).DB : undefined

	const driver = isD1Database(binding)
		? createD1Driver(binding)
		: await createNodeSqliteDriver(resolveDbFile(processEnv))

	const location = driver.kind === "d1" ? "DB (D1 binding)" : resolveDbFile(processEnv)
	const report =
		autoMigrateEnabled(processEnv) && !options.skipMigrations
			? await applyMigrations(driver)
			: { applied: [] as string[], alreadyApplied: [] as string[] }

	return { driver, mode: driver.kind, location, migrations: report.applied }
}

let cached: Promise<ResolvedDb> | null = null

/** D1 bindings whose schema a request has already proven current in this isolate. */
const migratedBindings = new WeakSet<object>()

/**
 * Database handle for this request's env.
 *
 * Node (dev server, tests): one SQLite handle per process; the promise is
 * cached so concurrent first requests cannot open the file twice.
 *
 * D1 (Workers): NOTHING in flight is shared between requests. A D1 query
 * started by request A belongs to A's I/O context; when A ends (response sent
 * or client gone) a promise it left pending never settles, and caching that
 * promise at module scope hangs every later request in the isolate (#158).
 * Each request builds its own cheap driver instead, and only the settled fact
 * "this binding is migrated" is remembered. After the first successful boot
 * the hot path does no migration work at all.
 */
export async function getDb(env?: unknown): Promise<ResolvedDb> {
	const binding =
		typeof env === "object" && env !== null ? (env as { DB?: unknown }).DB : undefined
	if (!isD1Database(binding)) {
		cached ??= resolveDb(env)
		return cached
	}
	const migrated = migratedBindings.has(binding)
	const resolved = await resolveDb(env, process.env, { skipMigrations: migrated })
	migratedBindings.add(binding)
	return resolved
}

/** Drop the cached handle (tests / scripts that reopen the same file). */
export function resetDbCache(): void {
	cached = null
}
