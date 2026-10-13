import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { applyMigrations } from "./apply"
import { createD1Driver } from "./d1"
import { createD1SqliteStub } from "./d1-sqlite-stub"
import type { SqlDriver } from "./types"

/**
 * Regression coverage for the FRO-68 blocker: D1's `exec()` splits on newlines
 * and cannot run a multi-line statement, so the boot-time migrator must never
 * hand one to it. These tests fail against the pre-FRO-72 code (driver
 * `exec -> binding.exec`, and a double that delegated straight to node:sqlite).
 */

const tempDirs: string[] = []

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-d1-driver-"))
	tempDirs.push(dir)
	return join(dir, "d1.sqlite")
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

/** The migrator's real DDL, which is multi-line. */
const MULTI_LINE_DDL = `CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

describe("D1 exec() fidelity", () => {
	it("the double rejects a multi-line exec exactly like the real binding", async () => {
		const stub = createD1SqliteStub(tempDbFile())

		await expect(stub.binding.exec(MULTI_LINE_DDL)).rejects.toThrow(
			/D1_EXEC_ERROR[\s\S]*incomplete input/,
		)

		stub.close()
	})

	it("the double still accepts a single-line exec (it is not just 'always throw')", async () => {
		const stub = createD1SqliteStub(tempDbFile())

		await expect(stub.binding.exec("CREATE TABLE single_line (id TEXT)")).resolves.toBeUndefined()

		stub.close()
	})

	it("the D1 driver never passes a multi-line statement to binding.exec", async () => {
		const stub = createD1SqliteStub(tempDbFile())
		const driver = createD1Driver(stub.binding)

		const report = await applyMigrations(driver)

		expect(report.applied).toEqual(["0001_init.sql", "0003_auth.sql"])
		// The positive side of the fix: every statement, DDL included, went
		// through prepare() — D1 never saw anything it would split.
		expect(stub.calls.some((call) => call.startsWith("prepare CREATE TABLE IF NOT EXISTS d1_migrations"))).toBe(
			true,
		)
		expect(stub.calls.some((call) => call.startsWith("prepare CREATE TABLE IF NOT EXISTS plans"))).toBe(true)
		// …and D1's line-splitting exec() was not used at all. This is the
		// invariant that matters: whatever goes through binding.exec() one day
		// must be a single-line statement.
		const execCalls = stub.calls.filter((entry) => entry.startsWith("exec "))
		expect(execCalls).toEqual([])
		for (const call of execCalls) {
			expect(call).not.toContain("\n")
		}

		stub.close()
	})

	it("the pre-FRO-72 driver implementation fails on the faithful double", async () => {
		const stub = createD1SqliteStub(tempDbFile())
		// Exactly what src/db/d1.ts did before this fix.
		const legacyDriver: SqlDriver = {
			...createD1Driver(stub.binding),
			async exec(sql: string): Promise<void> {
				await stub.binding.exec(sql)
			},
		}

		await expect(applyMigrations(legacyDriver)).rejects.toThrow(/D1_EXEC_ERROR[\s\S]*incomplete input/)

		stub.close()
	})
})
