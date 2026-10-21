import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { AUTO_MIGRATE_ENV, DB_FILE_ENV, resolveDb } from "."
import { MIGRATION_FILES } from "./migrations.generated"
import { createNodeSqliteDriver } from "./node-sqlite"
import { splitStatements } from "./sql"

const tempDirs: string[] = []

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-migrations-"))
	tempDirs.push(dir)
	return join(dir, "test.sqlite")
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

describe("migrations", () => {
	it("creates the schema on a fresh file database", async () => {
		const db = await resolveDb(undefined, { [DB_FILE_ENV]: tempDbFile() })

		expect(db.mode).toBe("node-sqlite")
		expect(db.migrations).toEqual([
			"0001_init.sql",
			"0002_onboarding_method.sql",
			"0003_device_authorization.sql",
		])

		const tables = await db.driver.all<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
		)
		expect(tables.map((table) => table.name)).toEqual(
			expect.arrayContaining(["plans", "user_settings", "user_onboarding", "deviceCode", "d1_migrations"]),
		)
		db.driver.close()
	})

	it("records one row per applied migration and applies nothing twice", async () => {
		const file = tempDbFile()

		const first = await resolveDb(undefined, { [DB_FILE_ENV]: file })
		const ledger = await first.driver.all<{ name: string; applied_at: string }>(
			"SELECT name, applied_at FROM d1_migrations",
		)
		expect(ledger.map((row) => row.name)).toEqual([
			"0001_init.sql",
			"0002_onboarding_method.sql",
			"0003_device_authorization.sql",
		])

		expect(ledger[0]?.applied_at).toBeTruthy()
		first.driver.close()

		// Second boot on the same file: nothing left to apply.
		const second = await resolveDb(undefined, { [DB_FILE_ENV]: file })
		expect(second.migrations).toEqual([])
		const after = await second.driver.all<{ name: string }>("SELECT name FROM d1_migrations")
		expect(after.map((row) => row.name)).toEqual([
			"0001_init.sql",
			"0002_onboarding_method.sql",
			"0003_device_authorization.sql",
		])

		second.driver.close()
	})

	it("adds the onboarding method column to an existing (0001) database", async () => {
		const file = tempDbFile()

		// Build a pre-0002 database by hand: baseline schema + the ledger row.
		const old = await createNodeSqliteDriver(file)
		await old.exec(
			"CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
		)
		const baseline = MIGRATION_FILES.find((migration) => migration.name === "0001_init.sql");
		expect(baseline).toBeTruthy()
		for (const statement of splitStatements(baseline!.sql)) await old.exec(statement)
		await old.run("INSERT INTO d1_migrations (name) VALUES (?)", ["0001_init.sql"])
		old.close()

		const upgraded = await resolveDb(undefined, { [DB_FILE_ENV]: file })
		expect(upgraded.migrations).toEqual(["0002_onboarding_method.sql", "0003_device_authorization.sql"])

		const columns = await upgraded.driver.all<{ name: string }>("PRAGMA table_info(user_onboarding)")
		expect(columns.map((column) => column.name)).toContain("method")
		upgraded.driver.close()
	})

	it("does not touch the database when auto-migrate is disabled", async () => {
		const file = tempDbFile()
		const db = await resolveDb(undefined, { [DB_FILE_ENV]: file, [AUTO_MIGRATE_ENV]: "0" })

		expect(db.migrations).toEqual([])
		const tables = await db.driver.all<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type = 'table'",
		)
		expect(tables.map((table) => table.name)).not.toContain("plans")
		db.driver.close()
	})
})
