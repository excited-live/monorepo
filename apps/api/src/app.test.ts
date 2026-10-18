import { defaultPlanInput } from "@excited-live/sim"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "./app"
import { DB_FILE_ENV, resolveDb, type ResolvedDb } from "./db"
import type { SqlDriver } from "./db/types"
import type { Hono } from "hono"
import type { ApiEnv } from "./lib/env"

const tempDirs: string[] = []

function tempDbFile(): string {
	const dir = mkdtempSync(join(tmpdir(), "excited-api-app-"))
	tempDirs.push(dir)
	return join(dir, "api.sqlite")
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

/** Open a database at `file` and build an app on top of it. */
async function openApi(file: string): Promise<{ app: Hono<ApiEnv>; db: ResolvedDb }> {
	const db = await resolveDb(undefined, { [DB_FILE_ENV]: file })
	return { app: createApp({ db: db.driver }), db }
}

function jsonRequest(method: string, userId: string | null, body?: unknown): RequestInit {
	return {
		method,
		headers: {
			"content-type": "application/json",
			...(userId ? { "x-user-id": userId } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	}
}

describe("api/v1/plan", () => {
	it("returns the default plan for an unknown user", async () => {
		const { app, db } = await openApi(tempDbFile())

		const response = await app.request("/api/v1/plan", { headers: { "x-user-id": "user-a" } })

		expect(response.status).toBe(200)
		expect(await response.text()).toBe(JSON.stringify(defaultPlanInput()))
		db.driver.close()
	})

	it("round-trips a PUT plan byte for byte", async () => {
		const { app, db } = await openApi(tempDbFile())
		// Distinctive marker: the default fixture would round-trip through the
		// GET fallback too, so a default-vs-default compare passes even with
		// persistence disabled (FRO-72 nit 1).
		const plan = { ...defaultPlanInput(), personalAllowances: 123456 } as ReturnType<
			typeof defaultPlanInput
		>
		expect(JSON.stringify(plan)).not.toBe(JSON.stringify(defaultPlanInput()))

		const put = await app.request("/api/v1/plan", jsonRequest("PUT", "user-a", plan))
		expect(put.status).toBe(200)
		expect(await put.json()).toEqual({ ok: true, data: plan })

		const get = await app.request("/api/v1/plan", { headers: { "x-user-id": "user-a" } })
		expect(await get.text()).toBe(JSON.stringify(plan))
		db.driver.close()
	})

	it("keys plans by x-user-id and keeps a fresh user clean", async () => {
		const { app, db } = await openApi(tempDbFile())
		const plan = { ...defaultPlanInput(), personalAllowances: 987654 } as ReturnType<
			typeof defaultPlanInput
		>

		await app.request("/api/v1/plan", jsonRequest("PUT", "user-a", plan))

		// user-a reads back its own plan (fails outright without persistence)…
		const own = await app.request("/api/v1/plan", { headers: { "x-user-id": "user-a" } })
		expect(await own.text()).toBe(JSON.stringify(plan))

		// …and user-b, who never wrote, is clean.
		const other = await app.request("/api/v1/plan", { headers: { "x-user-id": "user-b" } })
		expect(await other.text()).toBe(JSON.stringify(defaultPlanInput()))
		db.driver.close()
	})

	it("falls back to the default bucket without an x-user-id header", async () => {
		const { app, db } = await openApi(tempDbFile())
		const plan = { ...defaultPlanInput(), personalAllowances: 424242 } as ReturnType<
			typeof defaultPlanInput
		>

		await app.request("/api/v1/plan", jsonRequest("PUT", null, plan))

		const withoutHeader = await app.request("/api/v1/plan")
		expect(await withoutHeader.text()).toBe(JSON.stringify(plan))
		db.driver.close()
	})
})

describe("api/v1/settings", () => {
	it("returns defaults for an unknown user, with no birthday key", async () => {
		const { app, db } = await openApi(tempDbFile())

		const response = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-a" } })

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('{"profileName":"","gender":"female"}')
		db.driver.close()
	})

	it("round-trips settings including a birthday", async () => {
		const { app, db } = await openApi(tempDbFile())
		const settings = { profileName: "Prame", birthday: "1994-03-17", gender: "male" }

		const put = await app.request("/api/v1/settings", jsonRequest("PUT", "user-a", settings))
		expect(put.status).toBe(200)
		expect(await put.json()).toEqual({ ok: true, data: settings })

		const get = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-a" } })
		expect(await get.text()).toBe(JSON.stringify(settings))
		db.driver.close()
	})

	it("keeps a birthday-less PUT birthday-less on read", async () => {
		const { app, db } = await openApi(tempDbFile())
		const settings = { profileName: "Prame", gender: "male" }

		await app.request("/api/v1/settings", jsonRequest("PUT", "user-a", settings))

		const get = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-a" } })
		expect(await get.text()).toBe('{"profileName":"Prame","gender":"male"}')
		db.driver.close()
	})

	// FRO-72 nit 2 — this is the ONE intentional deviation from the pre-change
	// in-memory handler: `PUT` still echoes the request body byte for byte, but
	// the stored row is normalised into three columns, so a malformed body reads
	// back normalised (the old handler echoed the raw object). Every documented
	// contract case — all three keys with a `YYYY-MM-DD` birthday, or a
	// birthday-less body — is byte-identical to the old handler; see
	// apps/api/README.md ("Intentional deviations").
	it("normalises a malformed PUT on read, while PUT still echoes the body", async () => {
		const { app, db } = await openApi(tempDbFile())

		const empty = await app.request("/api/v1/settings", jsonRequest("PUT", "user-a", {}))
		expect(empty.status).toBe(200)
		expect(await empty.json()).toEqual({ ok: true, data: {} })
		const emptyRead = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-a" } })
		expect(await emptyRead.text()).toBe('{"profileName":"","gender":"female"}')

		// Unknown keys are dropped; wrong types fall back to the column default.
		const messy = { profileName: 42, gender: { nope: true }, unknownKey: "dropped" }
		await app.request("/api/v1/settings", jsonRequest("PUT", "user-b", messy))
		const messyRead = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-b" } })
		expect(await messyRead.text()).toBe('{"profileName":"","gender":"female"}')

		// An explicit null birthday reads back absent (the column is nullable).
		const nullBirthday = { profileName: "Nok", birthday: null, gender: "female" }
		await app.request("/api/v1/settings", jsonRequest("PUT", "user-c", nullBirthday))
		const nullRead = await app.request("/api/v1/settings", { headers: { "x-user-id": "user-c" } })
		expect(await nullRead.text()).toBe('{"profileName":"Nok","gender":"female"}')

		db.driver.close()
	})
})

describe("persistence across an API restart", () => {
	it("serves plan and settings saved by a previous process, and a fresh user starts clean", async () => {
		const file = tempDbFile()
		const plan = { ...defaultPlanInput(), personalAllowances: 777777 } as ReturnType<
			typeof defaultPlanInput
		>
		const settings = { profileName: "Prame", birthday: "1994-03-17", gender: "male" }

		// Process #1: write through the HTTP surface, then close the database.
		const first = await openApi(file)
		await first.app.request("/api/v1/plan", jsonRequest("PUT", "user-a", plan))
		await first.app.request("/api/v1/settings", jsonRequest("PUT", "user-a", settings))
		await first.app.request("/api/v1/plan", jsonRequest("PUT", "user-z", plan))
		first.db.driver.close()

		// Process #2: brand new handle + app on the same file.
		const second = await openApi(file)

		const persistedPlan = await second.app.request("/api/v1/plan", {
			headers: { "x-user-id": "user-a" },
		})
		expect(await persistedPlan.text()).toBe(JSON.stringify(plan))

		const persistedSettings = await second.app.request("/api/v1/settings", {
			headers: { "x-user-id": "user-a" },
		})
		expect(await persistedSettings.text()).toBe(JSON.stringify(settings))

		const freshUser = await second.app.request("/api/v1/plan", { headers: { "x-user-id": "brand-new" } })
		expect(await freshUser.text()).toBe(JSON.stringify(defaultPlanInput()))
		const freshSettings = await second.app.request("/api/v1/settings", {
			headers: { "x-user-id": "brand-new" },
		})
		expect(await freshSettings.text()).toBe('{"profileName":"","gender":"female"}')

		// Migrations are not re-applied on the second boot.
		expect(second.db.migrations).toEqual([])
		second.db.driver.close()

		// The data really is in the file, not in the process.
		const reopened = await resolveDb(undefined, { [DB_FILE_ENV]: file })
		const rows = await reopened.driver.all<{ user_id: string }>("SELECT user_id FROM plans ORDER BY user_id")
		expect(rows.map((row) => row.user_id)).toEqual(["user-a", "user-z"])
		reopened.driver.close()
	})
})

describe("unchanged endpoints", () => {
	it("keeps /health and / response shapes", async () => {
		const { app, db } = await openApi(tempDbFile())

		const health = await app.request("/health")
		expect(health.status).toBe(200)
		expect(Object.keys(await health.json()).sort()).toEqual(["service", "status", "timestamp"])

		const root = await app.request("/")
		expect(await root.json()).toEqual({ name: "excited.live API", version: "0.0.1", docs: "/openapi.json" })

		db.driver.close()
	})

	it("keeps sim routes working and their 400 guard", async () => {
		const { app, db } = await openApi(tempDbFile())

		const bad = await app.request("/api/v1/sim/monte-carlo", jsonRequest("POST", "user-a", {}))
		expect(bad.status).toBe(400)
		expect(await bad.json()).toEqual({ error: "Body must be { plan, config? }" })

		const ok = await app.request(
			"/api/v1/sim/simulate",
			jsonRequest("POST", "user-a", { plan: defaultPlanInput() }),
		)
		expect(ok.status).toBe(200)
		db.driver.close()
	})

	it("gives every request the resolved driver", async () => {
		const { app, db } = await openApi(tempDbFile())
		const drivers = new Set<SqlDriver>()
		await app.request("/api/v1/plan", { headers: { "x-user-id": "user-a" } })
		drivers.add(db.driver)
		expect(drivers.size).toBe(1)
		expect(db.mode).toBe("node-sqlite")
		db.driver.close()
	})
})

describe("api/v1/accounting domain errors", () => {
	it("creates an asset then updates it via PUT", async () => {
		const { app, db } = await openApi(tempDbFile())

		const asset = {
			entityId: "acc_personal",
			name: "Kasikorn Main Reserve",
			cost: 250000,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "cash",
			isDefault: true,
		}

		const created = await app.request("/api/v1/accounting/assets", jsonRequest("POST", "user-acc-1", asset))
		expect(created.status).toBe(201)
		const saved = (await created.json()) as { id: string }

		const updated = await app.request(
			`/api/v1/accounting/assets/${saved.id}`,
			jsonRequest("PUT", "user-acc-1", { ...saved, ...asset, name: "Kasikorn Main Reserve (edited)" }),
		)
		expect(updated.status).toBe(200)
		const updatedAsset = (await updated.json()) as { name: string }
		expect(updatedAsset.name).toBe("Kasikorn Main Reserve (edited)")

		db.driver.close()
	})

	it("maps a missing asset update to 404 instead of 500", async () => {
		const { app, db } = await openApi(tempDbFile())

		const res = await app.request(
			"/api/v1/accounting/assets/hw_ghost",
			jsonRequest("PUT", "user-acc-2", {
				id: "hw_ghost",
				entityId: "acc_personal",
				name: "Ghost",
				cost: 0,
				lifespanMonths: 0,
				purchaseDate: "2026-10",
				category: "cash",
			}),
		)

		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({ error: "Asset hw_ghost not found", code: "NOT_FOUND" })

		db.driver.close()
	})
})
