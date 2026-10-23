import type { SqlDriver, SqlStatement, SqlValue } from "./types"

/**
 * Kept in a variable on purpose: esbuild (through tsup) rewrites a literal
 * `import("node:sqlite")` into `import("sqlite")` in the bundle, which then
 * fails at runtime with ERR_MODULE_NOT_FOUND. A computed specifier is left
 * alone. (Found by scripts/persistence-proof.sh running the built dist.)
 */
const SQLITE_MODULE = "node:sqlite"
const FS_MODULE = "node:fs"
const PATH_MODULE = "node:path"

/**
 * Local SQLite driver built on Node's built-in `node:sqlite` (Node >= 22.13).
 *
 * Same engine and SQL dialect as Cloudflare D1, so dev, tests and CI execute
 * the real migrations and the real store SQL instead of a stand-in. Every Node
 * builtin this file needs is imported dynamically with a computed specifier,
 * so the Workers bundle (`dist/worker.js`) carries no `fs`/`path`/`sqlite`
 * static import — the D1 branch is the deploy path and the module graph it
 * ships must stay Node-builtin-free. (Verified against built
 * `dist/chunk-*.js`; see docs/persistence-proof.md.)
 */
export async function createNodeSqliteDriver(file: string): Promise<SqlDriver> {
	const { mkdirSync } = (await import(FS_MODULE)) as typeof import("node:fs")
	const { dirname } = (await import(PATH_MODULE)) as typeof import("node:path")
	const { DatabaseSync: SqliteDatabase } = (await import(SQLITE_MODULE)) as typeof import("node:sqlite")

	// ":memory:" (tests) has no directory to create.
	if (file !== ":memory:") {
		mkdirSync(dirname(file), { recursive: true })
	}
	const db = new SqliteDatabase(file)
	// SQLite leaves foreign keys off by default; D1 enforces them, so match it.
	db.exec("PRAGMA foreign_keys = ON")
	// Wait for a competing writer instead of failing with SQLITE_BUSY: several
	// vitest workers share one .data file (and so do concurrent dev processes),
	// and the boot migration runner is the first writer to race. D1 serialises
	// server-side, so this only exists to make the local driver behave the same
	// way instead of surfacing "database is locked" as a 500.
	db.exec("PRAGMA busy_timeout = 5000")

	return {
		kind: "node-sqlite",
		async exec(sql: string): Promise<void> {
			// Same call shape as the D1 driver (src/db/d1.ts): one statement, no
			// parameters. `prepare()` refuses a multi-statement string, so a
			// bag of statements can never slip through this door unnoticed.
			db.prepare(sql).run()
		},
		async all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
			return db.prepare(sql).all(...params) as T[]
		},
		async first<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
			return (db.prepare(sql).get(...params) ?? null) as T | null
		},
		async run(sql: string, params: readonly SqlValue[] = []): Promise<{ changes: number }> {
			const result = db.prepare(sql).run(...params)
			return { changes: Number(result.changes) }
		},
		async batch(statements: readonly SqlStatement[]): Promise<void> {
			// Synchronous from BEGIN to COMMIT, so no other query can interleave.
			db.exec("BEGIN")
			try {
				for (const statement of statements) {
					db.prepare(statement.sql).run(...(statement.params ?? []))
				}
				db.exec("COMMIT")
			} catch (error) {
				try {
					db.exec("ROLLBACK")
				} catch {
					// Already rolled back by SQLite (e.g. the COMMIT itself failed).
				}
				throw error
			}
		},
		close(): void {
			db.close()
		},
	}
}
