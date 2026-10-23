import { MIGRATION_FILES } from "./migrations.generated"
import { splitStatements } from "./sql"
import type { SqlDriver } from "./types"

/**
 * Migration bookkeeping table.
 *
 * Identical DDL to the one wrangler creates for `wrangler d1 migrations apply`
 * (id / name / applied_at), so the runtime migrator and the wrangler CLI share
 * one ledger and can be used interchangeably: whichever applies a file first,
 * the other sees it as done.
 */
const MIGRATIONS_TABLE_DDL = `CREATE TABLE IF NOT EXISTS d1_migrations (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT UNIQUE,
	applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

export interface MigrationReport {
	/** Migration files applied by this call. */
	applied: string[]
	/** Migration files already recorded before this call. */
	alreadyApplied: string[]
}

/**
 * Read the ledger, or null when the table does not exist yet (fresh database).
 *
 * Read first, DDL second, on purpose: `CREATE TABLE IF NOT EXISTS` still takes
 * a schema lock even when the table is already there, and on D1 that write on a
 * hot request path is what deadlocked prelive traffic on 2026-10-23 (requests
 * hung for the full wall clock at ~3 ms CPU, roughly half the time). In steady
 * state this is now one cheap SELECT per isolate; the DDL only ever runs
 * against a database that has no ledger.
 */
async function readLedger(driver: SqlDriver): Promise<Set<string> | null> {
	try {
		const rows = await driver.all<{ name: string }>("SELECT name FROM d1_migrations")
		return new Set(rows.map((row) => row.name))
	} catch {
		return null
	}
}

/**
 * Apply every migration that is not yet recorded, in filename order.
 *
 * Idempotent: re-running applies nothing. Each file is applied statement by
 * statement, then recorded — a failure leaves the file unrecorded so the next
 * boot retries it.
 */
export async function applyMigrations(driver: SqlDriver): Promise<MigrationReport> {
	let recorded = await readLedger(driver)
	if (recorded === null) {
		await driver.exec(MIGRATIONS_TABLE_DDL)
		recorded = new Set<string>()
	}

	const applied: string[] = []
	for (const file of MIGRATION_FILES) {
		if (recorded.has(file.name)) continue
		for (const statement of splitStatements(file.sql)) {
			await driver.exec(statement)
		}
		// IGNORE, not plain INSERT: two processes booting against one fresh
		// database can both reach this line, and a UNIQUE violation there would
		// fail a request for no reason. The ledger row already wins either way.
		await driver.run("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)", [file.name])
		applied.push(file.name)
	}

	return {
		applied,
		alreadyApplied: MIGRATION_FILES.map((file) => file.name).filter((name) => recorded.has(name)),
	}
}
