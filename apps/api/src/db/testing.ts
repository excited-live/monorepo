import { applyMigrations } from "./apply"
import { createNodeSqliteDriver } from "./node-sqlite"
import type { SqlDriver } from "./types"

/**
 * A fresh in-memory SQLite database with every migration applied.
 *
 * Test-only helper: real SQLite with the real migrations and foreign keys on,
 * so store tests exercise the same SQL and constraints production runs.
 */
export async function createTestDriver(): Promise<SqlDriver> {
	const driver = await createNodeSqliteDriver(":memory:")
	await applyMigrations(driver)
	return driver
}
