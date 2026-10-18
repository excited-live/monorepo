import { describe, expect, it } from "vitest";
import {
	addAccount,
	addAsset,
	addExpense,
	addIncome,
	addLiability,
	deleteAccount,
	deleteAsset,
	deleteExpense,
	deleteIncome,
	deleteLiability,
	deleteTransfer,
	recordTransfer,
	setCareerIncome,
	updateAccount,
	updateAsset,
	updateExpense,
	updateIncome,
	updateLiability,
	updateTransfer,
	type AccountingSnapshot,
} from "../src";

const EMPTY_SNAPSHOT: AccountingSnapshot = {
	accounts: [
		{
			id: "acc_personal",
			name: "Personal",
			type: "personal",
			cashReserve: 100000,
			currency: "THB",
		},
	],
	subscriptions: [],
	hardware: [],
	revenues: [],
	transfers: [],
	liabilities: [],
};

describe("@excited-live/accounting - Pure Commands", () => {
	it("adds an account and creates its default cash wallet", () => {
		const res = addAccount(EMPTY_SNAPSHOT, {
			name: "Design Studio",
			id: "acc_studio",
		});

		expect(res.account.id).toBe("acc_studio");
		expect(res.account.name).toBe("Design Studio");
		expect(res.defaultWallet.entityId).toBe("acc_studio");
		expect(res.defaultWallet.category).toBe("cash");
		expect(res.defaultWallet.isDefault).toBe(true);
		expect(res.snapshot.accounts).toHaveLength(2);
		expect(res.snapshot.hardware).toHaveLength(1);
	});

	it("updates account fields cleanly", () => {
		const updated = updateAccount(EMPTY_SNAPSHOT, "acc_personal", {
			name: "Prame Personal",
		});
		expect(updated.accounts[0]?.name).toBe("Prame Personal");
	});

	it("cascades account deletion across expenses, hardware, revenues, liabilities, and transfers", () => {
		const state: AccountingSnapshot = {
			accounts: [
				{ id: "acc_personal", name: "Personal", type: "personal", cashReserve: 0, currency: "THB" },
				{ id: "acc_biz", name: "Venture", type: "business", cashReserve: 0, currency: "THB" },
			],
			subscriptions: [
				{ id: "sub_1", entityId: "acc_biz", name: "Hosting", amount: 100, cycle: "monthly", category: "dev", nextRenewalDate: "2026-10-15", active: true },
				{ id: "sub_2", entityId: "acc_personal", name: "Gym", amount: 100, cycle: "monthly", category: "health", nextRenewalDate: "2026-10-15", active: true },
			],
			hardware: [
				{ id: "hw_1", entityId: "acc_biz", name: "Server", cost: 1000, lifespanMonths: 12, purchaseDate: "2026-01", category: "workstation" },
			],
			revenues: [
				{ id: "rev_1", entityId: "acc_biz", name: "Client", amount: 5000, frequency: "monthly", source: "stripe", active: true },
			],
			liabilities: [
				{ id: "liab_1", entityId: "acc_biz", name: "Loan", amount: 200, category: "business_loan", active: true },
			],
			transfers: [
				{ id: "tx_1", fromEntityId: "acc_personal", toEntityId: "acc_biz", amount: 1000, date: "2026-10", note: "Seed" },
			],
		};

		const next = deleteAccount(state, "acc_biz");

		expect(next.accounts).toHaveLength(1);
		expect(next.subscriptions).toHaveLength(1);
		expect(next.subscriptions[0]?.id).toBe("sub_2");
		expect(next.hardware).toHaveLength(0);
		expect(next.revenues).toHaveLength(0);
		expect(next.liabilities).toHaveLength(0);
		expect(next.transfers).toHaveLength(0);
	});

	it("manages expenses (add, update, delete)", () => {
		const addRes = addExpense(EMPTY_SNAPSHOT, {
			entityId: "acc_personal",
			name: "Internet",
			amount: 800,
			cycle: "monthly",
			category: "utilities",
			nextRenewalDate: "2026-11-01",
			active: true,
			id: "sub_net",
		});
		expect(addRes.snapshot.subscriptions).toHaveLength(1);

		const updated = updateExpense(addRes.snapshot, {
			...addRes.expense,
			amount: 850,
		});
		expect(updated.subscriptions[0]?.amount).toBe(850);

		const deleted = deleteExpense(updated, "sub_net");
		expect(deleted.subscriptions).toHaveLength(0);
	});

	it("manages assets with default cash exclusivity", () => {
		const firstCash = addAsset(EMPTY_SNAPSHOT, {
			entityId: "acc_personal",
			name: "Cash 1",
			cost: 0,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "cash",
			isDefault: true,
			id: "hw_cash1",
		});
		expect(firstCash.snapshot.hardware[0]?.isDefault).toBe(true);

		const secondCash = addAsset(firstCash.snapshot, {
			entityId: "acc_personal",
			name: "Cash 2",
			cost: 0,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "cash",
			isDefault: true,
			id: "hw_cash2",
		});
		// Cash 1 should now NOT be default, Cash 2 is default
		expect(secondCash.snapshot.hardware.find((h) => h.id === "hw_cash1")?.isDefault).toBe(false);
		expect(secondCash.snapshot.hardware.find((h) => h.id === "hw_cash2")?.isDefault).toBe(true);

		const updated = updateAsset(secondCash.snapshot, {
			...secondCash.snapshot.hardware.find((h) => h.id === "hw_cash1")!,
			isDefault: true,
		});
		expect(updated.hardware.find((h) => h.id === "hw_cash1")?.isDefault).toBe(true);
		expect(updated.hardware.find((h) => h.id === "hw_cash2")?.isDefault).toBe(false);

		const deleted = deleteAsset(updated, "hw_cash1");
		expect(deleted.hardware).toHaveLength(1);
	});

	it("manages revenues and career income synchronization", () => {
		const res = addIncome(EMPTY_SNAPSHOT, {
			entityId: "acc_personal",
			name: "Consulting",
			amount: 10000,
			frequency: "monthly",
			source: "freelance",
			active: true,
			id: "rev_1",
		});
		expect(res.snapshot.revenues).toHaveLength(1);

		const updated = updateIncome(res.snapshot, {
			...res.income,
			amount: 15000,
		});
		expect(updated.revenues[0]?.amount).toBe(15000);

		const withCareer = setCareerIncome(res.snapshot, {
			entityId: "acc_personal",
			salary: 90000,
			paydayDayOfMonth: 28,
			title: "Staff Engineer",
			company: "Excited Live",
		});
		expect(withCareer.accounts[0]?.salary).toBe(90000);
		expect(withCareer.accounts[0]?.careerTitle).toBe("Staff Engineer");
		expect(withCareer.revenues.some((r) => r.source === "salary" && r.amount === 90000)).toBe(true);

		const afterSalaryDelete = deleteIncome(
			withCareer,
			withCareer.revenues.find((r) => r.source === "salary")!.id,
		);
		expect(afterSalaryDelete.accounts[0]?.salary).toBe(0);
	});

	it("keeps a projected promotion separate from the current career stream", () => {
		const base = addIncome(EMPTY_SNAPSHOT, {
			entityId: "acc_personal",
			name: "Current salary",
			amount: 80000,
			frequency: "monthly",
			source: "salary",
			active: true,
			id: "rev_current",
		}).snapshot;
		const withPrimary = setCareerIncome(base, {
			entityId: "acc_personal",
			salary: 80000,
			title: "Engineer",
		});

		// A promotion is a second, later-dated salary stream.
		const withPromotion = addIncome(withPrimary, {
			entityId: "acc_personal",
			name: "Promotion",
			amount: 120000,
			frequency: "monthly",
			source: "salary",
			active: true,
			startMonth: "2027-01",
			id: "rev_promotion",
		}).snapshot;

		// Editing the career updates the earliest-starting stream only.
		const edited = setCareerIncome(withPromotion, {
			entityId: "acc_personal",
			salary: 85000,
			title: "Senior Engineer",
		});
		const current = edited.revenues.find((r) => r.id === "rev_current")!;
		const promotion = edited.revenues.find((r) => r.id === "rev_promotion")!;
		expect(current.amount).toBe(85000);
		expect(current.endMonth).toBeUndefined();
		expect(promotion.amount).toBe(120000);
		expect(promotion.startMonth).toBe("2027-01");

		// Deleting the promotion leaves the account's current salary intact.
		const afterPromotionDelete = deleteIncome(edited, "rev_promotion");
		expect(afterPromotionDelete.accounts[0]?.salary).toBe(85000);
		expect(afterPromotionDelete.revenues.map((r) => r.id)).toEqual(["rev_current"]);
	});

	it("manages liabilities (add, update, delete)", () => {
		const res = addLiability(EMPTY_SNAPSHOT, {
			entityId: "acc_personal",
			name: "Car Loan",
			amount: 12000,
			category: "car_loan",
			active: true,
			id: "liab_car",
		});
		expect(res.snapshot.liabilities).toHaveLength(1);

		const updated = updateLiability(res.snapshot, {
			...res.liability,
			amount: 11500,
		});
		expect(updated.liabilities?.[0]?.amount).toBe(11500);

		const deleted = deleteLiability(updated, "liab_car");
		expect(deleted.liabilities).toHaveLength(0);
	});

	it("records and updates capital transfers with target asset creation", () => {
		const txRes = recordTransfer(EMPTY_SNAPSHOT, {
			fromEntityId: "acc_personal",
			toEntityId: "acc_biz_new",
			amount: 50000,
			date: "2026-10",
			targetAssetId: "primary_cash",
			id: "tx_init",
		});

		expect(txRes.snapshot.transfers).toHaveLength(1);
		expect(txRes.createdAsset?.category).toBe("cash");
		expect(txRes.createdAsset?.entityId).toBe("acc_biz_new");
		expect(txRes.transfer.targetAssetId).toBe(txRes.createdAsset?.id);

		const updated = updateTransfer(txRes.snapshot, {
			...txRes.transfer,
			amount: 60000,
		});
		expect(updated.transfers[0]?.amount).toBe(60000);

		const deleted = deleteTransfer(updated, "tx_init");
		expect(deleted.transfers).toHaveLength(0);
	});
});
