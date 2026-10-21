import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { MIGRATION_FILES } from "./migrations.generated"
import { splitStatements } from "./sql"

const migrationsDir = new URL("../../migrations/", import.meta.url)

describe("migration mirror parity", () => {
	it("mirrors every .sql file, byte for byte, in filename order", () => {
		const files = readdirSync(migrationsDir)
			.filter((name) => name.endsWith(".sql"))
			.sort()

		expect(files.length).toBeGreaterThan(0)
		expect(MIGRATION_FILES.map((file) => file.name)).toEqual(files)

		for (const file of MIGRATION_FILES) {
			const onDisk = readFileSync(new URL(file.name, migrationsDir), "utf8")
			// Regenerate with `pnpm --filter @excited-live/api gen:migrations`
			expect(file.sql, `${file.name} is out of sync with migrations/${file.name}`).toBe(onDisk)
		}
	})

	it("splits into one statement per semicolon, dropping comments", () => {
		const statements = splitStatements(
			[
				"-- a comment",
				"CREATE TABLE a (id TEXT);",
				"",
				"CREATE TABLE b (",
				"\tid TEXT",
				");",
			].join("\n"),
		)
		expect(statements).toEqual([
			"CREATE TABLE a (id TEXT)",
			"CREATE TABLE b (\n\tid TEXT\n)",
		])
	})

	it("models both tables the stores need", () => {
		const statements = MIGRATION_FILES.flatMap((file) => splitStatements(file.sql))
		expect(statements.some((sql) => /CREATE TABLE IF NOT EXISTS plans\b/i.test(sql))).toBe(true)
		expect(statements.some((sql) => /CREATE TABLE IF NOT EXISTS user_settings\b/i.test(sql))).toBe(true)
		expect(statements.some((sql) => /CREATE TABLE IF NOT EXISTS user_onboarding\b/i.test(sql))).toBe(true)
	})
})
