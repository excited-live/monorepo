import { describe, expect, it } from "vitest";
import { testClient } from "hono/testing";
import { createAccountingRouter } from "./accounting.routes";
import { createAccountingService } from "../service/accounting.service";
import { createMemoryAccountingRepository } from "../repository/memory-accounting.repository";

describe("Accounting Routes", () => {
	const setupClient = () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);
		const router = createAccountingRouter({ service });
		return testClient(router);
	};

	it("GET /snapshot returns default empty snapshot for new user", async () => {
		const client = setupClient();
		const res = await client.snapshot.$get();

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.isDefault).toBe(true);
		expect(data.accounts).toHaveLength(1);
		expect(data.accounts[0]?.id).toBe("acc_personal");
	});

	it("POST /accounts creates business account and default wallet", async () => {
		const client = setupClient();
		const res = await client.accounts.$post({
			json: {
				name: "Starlight Media",
				id: "acc_starlight",
			},
		});

		expect(res.status).toBe(201);
		const created = await res.json();
		expect(created.name).toBe("Starlight Media");

		const snapRes = await client.snapshot.$get();
		const snap = await snapRes.json();
		expect(snap.accounts).toHaveLength(2);
		expect(snap.hardware).toHaveLength(1);
		expect(snap.hardware[0]?.category).toBe("cash");
	});

	it("rejects invalid account payload with 400", async () => {
		const client = setupClient();
		const res = await client.accounts.$post({ json: { name: "" } });
		expect(res.status).toBe(400);
	});

	it("POST /expenses adds recurring subscription with Zod validation", async () => {
		const client = setupClient();
		const res = await client.expenses.$post({
			json: {
				entityId: "acc_personal",
				name: "Adobe CC",
				amount: 1800,
				cycle: "monthly",
				category: "software",
				nextRenewalDate: "2026-11-15",
				active: true,
			},
		});

		expect(res.status).toBe(201);
		const sub = await res.json();
		expect(sub.name).toBe("Adobe CC");
		expect(sub.amount).toBe(1800);
	});

	it("computes monthly ledger via GET /ledger/:yearMonth", async () => {
		const client = setupClient();
		await client.incomes.$post({
			json: {
				entityId: "acc_personal",
				name: "Salary",
				amount: 80000,
				frequency: "monthly",
				source: "salary",
				active: true,
			},
		});

		const res = await client.ledger[":yearMonth"].$get({
			param: { yearMonth: "2026-10" },
			query: { entityId: "acc_personal" },
		});

		expect(res.status).toBe(200);
		const ledger = await res.json();
		expect(ledger.summary.totalInflow).toBe(80000);
	});
});
