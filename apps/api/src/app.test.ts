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


describe("api/v1/onboarding", () => {
	it("returns defaults for an unknown user", async () => {
		const { app, db } = await openApi(tempDbFile());
		const response = await app.request("/api/v1/onboarding", { headers: { "x-user-id": "user-a" } });
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toMatchObject({
			userId: "user-a",
			appId: "biz-mobile",
			isCompleted: false,
			completedAt: null,
			done: ["create_account"],
			skipped: [],
		});
		db.driver.close();
	});

	it("round-trips progress and completion", async () => {
		const { app, db } = await openApi(tempDbFile());
		const put = await app.request(
			"/api/v1/onboarding",
			jsonRequest("PUT", "user-a", {
				appId: "biz-mobile",
				done: ["create_account", "add_income"],
				skipped: ["add_business"],
				isCompleted: false,
			}),
		);
		expect(put.status).toBe(200);
		const putData = await put.json();
		expect(putData.data.done).toEqual(["create_account", "add_income"]);

		const get = await app.request("/api/v1/onboarding?app=biz-mobile", { headers: { "x-user-id": "user-a" } });
		expect(get.status).toBe(200);
		const getData = await get.json();
		expect(getData.done).toEqual(["create_account", "add_income"]);
		expect(getData.skipped).toEqual(["add_business"]);
		expect(getData.isCompleted).toBe(false);
		db.driver.close();
	});

	it("rejects a malformed payload with 400", async () => {
		const { app, db } = await openApi(tempDbFile());
		const response = await app.request("/api/v1/onboarding", jsonRequest("PUT", "user-a", { done: 5 }));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Malformed onboarding payload" });

		const stillDefault = await app.request("/api/v1/onboarding", { headers: { "x-user-id": "user-a" } });
		expect((await stillDefault.json()).done).toEqual(["create_account"]);
		db.driver.close();
	});
});

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
	/** The user's personal entity id (the first read bootstraps it). */
	async function personalId(app: Hono<ApiEnv>, userId: string): Promise<string> {
		const res = await app.request("/api/v1/accounting/entities", jsonRequest("GET", userId));
		const entities = (await res.json()) as Array<{ id: string; type: string }>;
		const personal = entities.find((entity) => entity.type === "personal");
		if (!personal) throw new Error("no personal entity");
		return personal.id;
	}

	it("creates a cash asset then patches it", async () => {
		const { app, db } = await openApi(tempDbFile());
		const entityId = await personalId(app, "user-acc-1");

		const created = await app.request(
			"/api/v1/accounting/assets",
			jsonRequest("POST", "user-acc-1", {
				kind: "cash",
				entityId,
				name: "Kasikorn Main Reserve",
				category: "bank",
				balance: 250000,
				balanceAsOf: "2026-10",
				isDefault: true,
			}),
		);
		expect(created.status).toBe(201);
		const saved = (await created.json()) as { id: string };

		const patched = await app.request(
			`/api/v1/accounting/assets/${saved.id}`,
			jsonRequest("PATCH", "user-acc-1", { name: "Kasikorn Main Reserve (edited)", version: 1 }),
		);
		expect(patched.status).toBe(200);
		expect(await patched.json()).toMatchObject({ name: "Kasikorn Main Reserve (edited)", version: 2 });

		db.driver.close();
	});

	it("maps a missing asset patch to 404 instead of 500", async () => {
		const { app, db } = await openApi(tempDbFile());
		const id = crypto.randomUUID();

		const res = await app.request(
			`/api/v1/accounting/assets/${id}`,
			jsonRequest("PATCH", "user-acc-2", { name: "Ghost" }),
		);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: `Asset ${id} not found`, code: "NOT_FOUND" });

		db.driver.close();
	});

	it("maps a stale version to 409", async () => {
		const { app, db } = await openApi(tempDbFile());
		const entityId = await personalId(app, "user-acc-3");
		const created = await app.request(
			"/api/v1/accounting/assets",
			jsonRequest("POST", "user-acc-3", { kind: "cash", entityId, name: "Wallet", category: "cash" }),
		);
		const saved = (await created.json()) as { id: string };
		await app.request(
			`/api/v1/accounting/assets/${saved.id}`,
			jsonRequest("PATCH", "user-acc-3", { name: "Wallet 2", version: 1 }),
		);

		const stale = await app.request(
			`/api/v1/accounting/assets/${saved.id}`,
			jsonRequest("PATCH", "user-acc-3", { name: "Wallet 3", version: 1 }),
		);

		expect(stale.status).toBe(409);
		expect(await stale.json()).toMatchObject({ code: "VERSION_CONFLICT" });

		db.driver.close();
	});

	it("maps a rejected body to 400", async () => {
		const { app, db } = await openApi(tempDbFile());
		const entityId = await personalId(app, "user-acc-4");

		const res = await app.request(
			"/api/v1/accounting/assets",
			jsonRequest("POST", "user-acc-4", { kind: "cash", entityId, name: "", category: "cash" }),
		);

		expect(res.status).toBe(400);

		db.driver.close();
	});
});
