import { describe, expect, it } from "vitest";
import { createAccountingService } from "./accounting.service";
import { createMemoryAccountingRepository } from "../repository/memory-accounting.repository";

describe("AccountingService", () => {
	it("returns clean empty snapshot for new user with no seed data", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);

		const snapshot = await service.getSnapshot("user_new");
		expect(snapshot.isDefault).toBe(true);
		expect(snapshot.accounts).toHaveLength(1);
		expect(snapshot.accounts[0]?.id).toBe("acc_personal");
		expect(snapshot.subscriptions).toHaveLength(0);
		expect(snapshot.hardware).toHaveLength(0);
		expect(snapshot.revenues).toHaveLength(0);
		expect(snapshot.transfers).toHaveLength(0);
	});

	it("adds account and creates default cash wallet", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);

		const acc = await service.addAccount("user_1", {
			name: "Venture Corp",
			id: "acc_venture",
		});

		expect(acc.id).toBe("acc_venture");
		const snapshot = await service.getSnapshot("user_1");
		expect(snapshot.accounts).toHaveLength(2);
		expect(snapshot.hardware).toHaveLength(1);
		expect(snapshot.hardware[0]?.category).toBe("cash");
		expect(snapshot.hardware[0]?.isDefault).toBe(true);
	});

	it("adds, updates, and deletes expenses", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);

		const expense = await service.addExpense("user_1", {
			entityId: "acc_personal",
			name: "Netflix",
			amount: 400,
			cycle: "monthly",
			category: "entertainment",
			nextRenewalDate: "2026-11-01",
			active: true,
			id: "sub_netflix",
		});
		expect(expense.id).toBe("sub_netflix");

		await service.updateExpense("user_1", {
			...expense,
			amount: 450,
		});
		const snapshot = await service.getSnapshot("user_1");
		expect(snapshot.subscriptions[0]?.amount).toBe(450);

		await service.deleteExpense("user_1", "sub_netflix");
		const afterDelete = await service.getSnapshot("user_1");
		expect(afterDelete.subscriptions).toHaveLength(0);
	});

	it("cascades account deletion", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);

		await service.addAccount("user_1", { name: "Venture", id: "acc_biz" });
		await service.addExpense("user_1", {
			entityId: "acc_biz",
			name: "Hosting",
			amount: 1000,
			cycle: "monthly",
			category: "hosting",
			nextRenewalDate: "2026-11-01",
			active: true,
			id: "exp_1",
		});

		await service.deleteAccount("user_1", "acc_biz");
		const snapshot = await service.getSnapshot("user_1");
		expect(snapshot.accounts.some((a) => a.id === "acc_biz")).toBe(false);
		expect(snapshot.subscriptions.some((s) => s.entityId === "acc_biz")).toBe(false);
		expect(snapshot.hardware.some((h) => h.entityId === "acc_biz")).toBe(false);
	});

	it("computes monthly ledger", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);

		await service.addIncome("user_1", {
			entityId: "acc_personal",
			name: "Freelance",
			amount: 50000,
			frequency: "monthly",
			source: "freelance",
			active: true,
		});

		const ledger = await service.getLedger("user_1", "2026-10", "acc_personal");
		expect(ledger.summary.yearMonth).toBe("2026-10");
		expect(ledger.summary.totalInflow).toBe(50000);
	});

	it("backfills start months and wallet as-of dates when loading old snapshots", async () => {
		const repo = createMemoryAccountingRepository();
		const service = createAccountingService(repo);
		await repo.save("user_old", {
			accounts: [{ id: "acc_personal", name: "Personal", type: "personal", cashReserve: 0, currency: "THB" }],
			hardware: [
				{ id: "hw_w", entityId: "acc_personal", name: "Bank", cost: 1000, lifespanMonths: 0, purchaseDate: "Historical", category: "cash", isDefault: true },
			],
			subscriptions: [
				{ id: "s1", entityId: "acc_personal", name: "Rent", amount: 100, cycle: "monthly", category: "housing", nextRenewalDate: "2026-11-01", active: true },
			],
			revenues: [
				{ id: "r1", entityId: "acc_personal", name: "Salary", amount: 500, frequency: "monthly", source: "salary", active: true },
			],
			transfers: [],
			liabilities: [],
		});

		const snapshot = await service.getSnapshot("user_old");
		const savedMonth = snapshot.updatedAt!.slice(0, 7);
		expect(snapshot.hardware[0]?.purchaseDate).toBe(savedMonth);
		expect(snapshot.subscriptions[0]?.startMonth).toBe(savedMonth);
		expect(snapshot.revenues[0]?.startMonth).toBe(savedMonth);
		expect(snapshot.revenues[0]?.endMonth).toBeUndefined();
	});
});
