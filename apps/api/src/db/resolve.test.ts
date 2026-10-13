import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { resolveDb } from "."
import { createD1SqliteStub } from "./d1-sqlite-stub"
import { createPlanStore } from "../stores/plan-store"
import { createSettingsStore } from "../stores/settings-store"
import { defaultPlanInput } from "@excited-live/sim"

const tempDirs: string[] = []

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-d1-"))
	tempDirs.push(dir)
	return join(dir, "d1.sqlite")
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

describe("database resolution", () => {
	it("prefers a D1 binding and runs the real migrations through the D1 driver", async () => {
		const stub = createD1SqliteStub(tempDbFile())

		const db = await resolveDb({ DB: stub.binding }, { EXCITED_API_DB_PATH: "not-used.sqlite" })

		expect(db.mode).toBe("d1")
		expect(db.migrations).toEqual(["0001_init.sql", "0002_biz_store.sql", "0003_auth.sql"])

		// The migrator goes through prepare/bind/run, not a local file handle.
		expect(stub.calls.some((call) => call.startsWith("prepare INSERT INTO d1_migrations"))).toBe(true)

		const planStore = createPlanStore(db.driver)
		const settingsStore = createSettingsStore(db.driver)
		const plan = { ...defaultPlanInput(), scenarioName: "d1 round-trip" } as ReturnType<
			typeof defaultPlanInput
		>

		await planStore.save("user-d1", plan)
		await settingsStore.save("user-d1", { profileName: "Prame", gender: "male" })

		expect(JSON.stringify(await planStore.get("user-d1"))).toBe(JSON.stringify(plan))
		expect(await settingsStore.get("user-d1")).toEqual({
			profileName: "Prame",
			birthday: undefined,
			gender: "male",
		})

		stub.close()
	})

	it("falls back to the local SQLite file when the env has no D1 binding", async () => {
		const db = await resolveDb({ DB: { not: "a d1 binding" } }, { EXCITED_API_DB_PATH: tempDbFile() })

		expect(db.mode).toBe("node-sqlite")
		db.driver.close()
	})
})
