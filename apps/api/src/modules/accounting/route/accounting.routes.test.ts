import { testClient } from "hono/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDriver } from "../../../db/testing";
import type { SqlDriver } from "../../../db/types";
import { createSqlAccountingRepository } from "../repository/sql-accounting.repository";
import { DomainError } from "../domain/errors";
import { createAccountingService } from "../service/accounting.service";
import { createAccountingRouter } from "./accounting.routes";

/** Every route once, through the typed client, against a real in-memory database. */
let driver: SqlDriver;
let client: ReturnType<typeof testClient<ReturnType<typeof createAccountingRouter>>>;

beforeEach(async () => {
	driver = await createTestDriver();
	const service = createAccountingService(createSqlAccountingRepository(driver));
	const router = createAccountingRouter({ service });
	// Same mapping as app.ts: domain errors carry their status, anything else is a 500.
	router.onError((err, c) =>
		err instanceof DomainError
			? c.json({ error: err.message, code: err.code }, err.status as 400)
			: c.text("Internal Server Error", 500),
	);
	client = testClient(router);
});

afterEach(() => {
	driver.close();
});

async function personalId(): Promise<string> {
	const res = await client.entities.$get();
	const entities = await res.json();
	const personal = entities.find((e) => e.type === "personal");
	if (!personal) throw new Error("no personal entity");
	return personal.id;
}

describe("entities", () => {
	it("lists, creates, reads, patches and deletes a business entity", async () => {
		const me = await personalId();
		expect((await client.entities.$get()).status).toBe(200);

		const created = await client.entities.$post({ json: { name: "Acme", asOf: "2026-03-15" } });
		expect(created.status).toBe(201);
		const acme = await created.json();
		expect(acme).toMatchObject({ name: "Acme", type: "business", version: 1 });

		const got = await client.entities[":id"].$get({ param: { id: acme.id } });
		expect(got.status).toBe(200);

		const patched = await client.entities[":id"].$patch({ param: { id: acme.id }, json: { name: "Acme Co", version: 1 } });
		expect(patched.status).toBe(200);
		expect(await patched.json()).toMatchObject({ name: "Acme Co", version: 2 });

		const deleted = await client.entities[":id"].$delete({ param: { id: acme.id } });
		expect(deleted.status).toBe(200);
		expect(await deleted.json()).toEqual({ ok: true });
		expect((await client.entities[":id"].$get({ param: { id: me } })).status).toBe(200);
	});
});

describe("assets", () => {
	it("lists, creates, reads, patches and deletes an asset", async () => {
		const me = await personalId();

		const list = await client.assets.$get({ query: { entityId: me, kind: "cash" } });
		expect(await list.json()).toHaveLength(1);

		const created = await client.assets.$post({
			json: { kind: "cash", entityId: me, name: "Savings", category: "bank", balance: 5000, balanceAsOf: "2026-01" },
		});
		expect(created.status).toBe(201);
		const savings = await created.json();
		expect(savings).toMatchObject({ kind: "cash", balance: 5000, isDefault: false });

		expect((await client.assets[":id"].$get({ param: { id: savings.id } })).status).toBe(200);

		const patched = await client.assets[":id"].$patch({
			param: { id: savings.id },
			json: { name: "Savings (edited)", version: 1 },
		});
		expect(await patched.json()).toMatchObject({ name: "Savings (edited)", version: 2 });

		const deleted = await client.assets[":id"].$delete({ param: { id: savings.id } });
		expect(await deleted.json()).toEqual({ ok: true });
	});

	it("refuses to clear the useful life of a straight-line asset", async () => {
		const me = await personalId();
		const laptop = await (
			await client.assets.$post({
				json: { kind: "fixed", entityId: me, name: "Laptop", category: "laptop", cost: 40000, acquiredOn: "2026-01", usefulLifeMonths: 36 },
			})
		).json();

		const cleared = await client.assets[":id"].$patch({ param: { id: laptop.id }, json: { usefulLifeMonths: null, version: 1 } });
		expect(cleared.status).toBe(400);
		expect(await cleared.json()).toMatchObject({
			code: "VALIDATION_ERROR",
			error: "usefulLifeMonths is required for straight-line depreciation",
		});
	});
});

describe("incomes", () => {
	it("lists, creates, reads, patches and deletes incomes, and sets the career salary", async () => {
		const me = await personalId();

		expect((await client.incomes.$get({ query: { entityId: me } })).status).toBe(200);

		const created = await client.incomes.$post({
			json: {
				kind: "business",
				entityId: me,
				name: "Retainer",
				category: "freelance",
				amount: 20000,
				startMonth: "2026-01",
			},
		});
		expect(created.status).toBe(201);
		const retainer = await created.json();

		expect((await client.incomes[":id"].$get({ param: { id: retainer.id } })).status).toBe(200);

		const patched = await client.incomes[":id"].$patch({ param: { id: retainer.id }, json: { amount: 25000, version: 1 } });
		expect(await patched.json()).toMatchObject({ amount: 25000, version: 2 });

		const deleted = await client.incomes[":id"].$delete({ param: { id: retainer.id } });
		expect(await deleted.json()).toEqual({ ok: true });

		const career = await client.incomes.career.$post({
			json: { entityId: me, salary: 50000, title: "Engineer", startMonth: "2026-01" },
		});
		expect(career.status).toBe(200);
		expect(await career.json()).toMatchObject({ income: { kind: "employment", amount: 50000, name: "Engineer" } });
	});
});

describe("expenses", () => {
	it("lists, creates, reads, patches and deletes an expense", async () => {
		const me = await personalId();

		expect((await client.expenses.$get({ query: { entityId: me } })).status).toBe(200);

		const created = await client.expenses.$post({
			json: { entityId: me, name: "Hosting", category: "subscription", amount: 300 },
		});
		expect(created.status).toBe(201);
		const hosting = await created.json();

		expect((await client.expenses[":id"].$get({ param: { id: hosting.id } })).status).toBe(200);

		const patched = await client.expenses[":id"].$patch({ param: { id: hosting.id }, json: { amount: 350, version: 1 } });
		expect(await patched.json()).toMatchObject({ amount: 350, version: 2 });

		const deleted = await client.expenses[":id"].$delete({ param: { id: hosting.id } });
		expect(await deleted.json()).toEqual({ ok: true });
	});
});

describe("liabilities", () => {
	it("lists, creates, reads, patches and deletes a revolving liability", async () => {
		const me = await personalId();

		expect((await client.liabilities.$get({ query: { entityId: me, kind: "revolving" } })).status).toBe(200);

		const created = await client.liabilities.$post({
			json: {
				kind: "revolving",
				entityId: me,
				name: "Card",
				category: "credit_card",
				amount: 1000,
				revolving: { creditLimit: 50000, balance: 2000, balanceAsOf: "2026-01" },
			},
		});
		expect(created.status).toBe(201);
		const card = await created.json();

		expect((await client.liabilities[":id"].$get({ param: { id: card.id } })).status).toBe(200);

		const patched = await client.liabilities[":id"].$patch({
			param: { id: card.id },
			json: { revolving: { balance: 3000 }, version: 1 },
		});
		expect(await patched.json()).toMatchObject({ revolving: { balance: 3000, creditLimit: 50000 }, version: 2 });

		const deleted = await client.liabilities[":id"].$delete({ param: { id: card.id } });
		expect(await deleted.json()).toEqual({ ok: true });
	});
});

describe("transfers", () => {
	it("lists, creates, reads, patches and deletes a transfer", async () => {
		const me = await personalId();
		const savings = await (
			await client.assets.$post({ json: { kind: "cash", entityId: me, name: "Savings", category: "bank" } })
		).json();

		const created = await client.transfers.$post({
			json: { fromEntityId: me, toAssetId: savings.id, amount: 1000, date: "2026-10-01" },
		});
		expect(created.status).toBe(201);
		const transfer = await created.json();
		expect(transfer).toMatchObject({ toAssetId: savings.id, amount: 1000, cycle: "one_time", note: "" });

		expect((await client.transfers.$get()).status).toBe(200);
		expect((await client.transfers[":id"].$get({ param: { id: transfer.id } })).status).toBe(200);

		const patched = await client.transfers[":id"].$patch({
			param: { id: transfer.id },
			json: { amount: 1500, version: 1 },
		});
		expect(await patched.json()).toMatchObject({ amount: 1500, version: 2 });

		const deleted = await client.transfers[":id"].$delete({ param: { id: transfer.id } });
		expect(await deleted.json()).toEqual({ ok: true });
	});
});

describe("computed", () => {
	it("returns the summary, the ledger and the projection", async () => {
		await personalId();

		const summary = await client.summary.$get({ query: { month: "2026-10" } });
		expect(summary.status).toBe(200);
		expect(await summary.json()).toMatchObject({ yearMonth: "2026-10", entities: [expect.any(Object)] });

		const ledger = await client.ledger[":yearMonth"].$get({ param: { yearMonth: "2026-10" }, query: {} });
		expect(ledger.status).toBe(200);
		expect(await ledger.json()).toMatchObject({ yearMonth: "2026-10", summary: { yearMonth: "2026-10" } });

		const missing = await client.ledger[":yearMonth"].$get({ param: { yearMonth: "2026-10" }, query: { entityId: "missing" } });
		expect(missing.status).toBe(404);

		const projection = await client.projection.$get({ query: { month: "2026-10", pastMonths: "2", futureMonths: "3" } });
		expect(projection.status).toBe(200);
		const body = await projection.json();
		expect(body.points.map((p) => p.yearMonth)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
	});
});

describe("balance sheet, cash flows and schedules", () => {
	it("adds a balance sheet to the summary", async () => {
		const me = await personalId();
		const summary = await (await client.summary.$get({ query: { month: "2026-10" } })).json();
		expect(summary.entities[0]?.balanceSheet).toMatchObject({ cash: 0, fixedAssets: 0, debt: 0, netWorth: 0 });
		expect(summary.consolidated.balanceSheet).toMatchObject({ netWorth: 0 });
		expect(summary.entities[0]?.entityId).toBe(me);
	});

	it("serves the cash-flow feed with a direction filter and 404s on an unknown entity", async () => {
		const me = await personalId();
		await client.incomes.$post({
			json: { kind: "employment", entityId: me, name: "Salary", category: "salary", amount: 50000, startMonth: "2026-10" },
		});

		const all = await client["cash-flows"].$get({ query: { month: "2026-10" } });
		expect(all.status).toBe(200);
		const feed = await all.json();
		expect(feed).toMatchObject({ yearMonth: "2026-10", entityId: me, items: [expect.objectContaining({ direction: "in" })] });
		expect(feed.totals.moneyIn).toBe(50000);

		const out = await client["cash-flows"].$get({ query: { month: "2026-10", direction: "out" } });
		expect(await out.json()).toMatchObject({ items: [], totals: { moneyIn: 50000 } });

		const missing = await client["cash-flows"].$get({ query: { month: "2026-10", entityId: "missing" } });
		expect(missing.status).toBe(404);
	});

	it("serves a loan schedule, defaults a loan amount, and refuses a schedule for other liabilities", async () => {
		const me = await personalId();
		const created = await client.liabilities.$post({
			json: {
				kind: "loan",
				entityId: me,
				name: "Loan",
				category: "loan",
				loan: { principal: 10000, annualRate: 0, termMonths: 10, originatedOn: "2026-01" },
			},
		});
		expect(created.status).toBe(201);
		const loan = await created.json();
		expect(loan).toMatchObject({ amount: 1000, startMonth: "2026-01" });

		const schedule = await client.liabilities[":id"].schedule.$get({ param: { id: loan.id }, query: {} });
		expect(schedule.status).toBe(200);
		const body = await schedule.json();
		expect(body).toMatchObject({ liabilityId: loan.id, kind: "loan" });
		expect(body.kind === "loan" && body.entries).toHaveLength(10);

		const other = await client.liabilities.$post({
			json: { kind: "other", entityId: me, name: "Tax", category: "tax", amount: 100 },
		});
		const otherId = (await other.json()).id;
		const refused = await client.liabilities[":id"].schedule.$get({ param: { id: otherId }, query: {} });
		expect(refused.status).toBe(400);
		expect(await refused.json()).toMatchObject({ error: "This liability has no schedule", code: "VALIDATION_ERROR" });
	});
});

describe("request validation", () => {
	// Invalid bodies are cast to `never` on purpose: the typed client would refuse to compile them.
	it("rejects an employment payload on a business income", async () => {
		const me = await personalId();
		const body = { kind: "business", entityId: me, name: "Gig", category: "freelance", amount: 100, employment: { employer: "Acme" } };
		const res = await client.incomes.$post({ json: body as never });
		expect(res.status).toBe(400);
	});

	it("rejects sourceAssetId on a non-investment income", async () => {
		const me = await personalId();
		const body = { kind: "business", entityId: me, name: "Gig", category: "freelance", amount: 100, sourceAssetId: crypto.randomUUID() };
		const res = await client.incomes.$post({ json: body as never });
		expect(res.status).toBe(400);
	});

	it("rejects a non-UUID client id and a missing month on the summary", async () => {
		const me = await personalId();
		const body = { id: "not-a-uuid", entityId: me, name: "X", category: "x", amount: 1 };
		const badId = await client.expenses.$post({ json: body as never });
		expect(badId.status).toBe(400);

		const noMonth = await client.summary.$get({ query: {} as never });
		expect(noMonth.status).toBe(400);
	});
});
