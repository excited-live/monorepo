import { calculateLoanPayment } from "@excited-live/accounting";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDriver } from "../../../db/testing";
import type { SqlDriver } from "../../../db/types";
import { DuplicateError, NotFoundError, ValidationError, VersionConflictError } from "../domain/errors";
import { createSqlAccountingRepository } from "../repository/sql-accounting.repository";
import { createAccountingService } from "./accounting.service";

const USER = "user-a";
const OTHER = "user-b";

let driver: SqlDriver;
let repo: ReturnType<typeof createSqlAccountingRepository>;
let service: ReturnType<typeof createAccountingService>;

beforeEach(async () => {
	driver = await createTestDriver();
	repo = createSqlAccountingRepository(driver);
	service = createAccountingService(repo);
});

afterEach(() => {
	driver.close();
});

async function personalEntity() {
	const entity = (await service.listEntities(USER)).find((e) => e.type === "personal");
	if (!entity) throw new Error("personal entity was not bootstrapped");
	return entity;
}

async function defaultWallet(entityId: string) {
	const wallet = (await service.listAssets(USER, { entityId, kind: "cash" })).find(
		(a) => a.kind === "cash" && a.isDefault,
	);
	if (!wallet) throw new Error("no default wallet");
	return wallet;
}

async function createBusiness(name = "Acme") {
	return service.createEntity(USER, { name, type: "business", asOf: "2026-03-15" });
}

describe("bootstrap", () => {
	it("creates exactly one personal entity and one wallet under concurrent first requests", async () => {
		await Promise.all([1, 2, 3, 4, 5].map(() => service.listAssets(USER, {})));

		const entities = await repo.list(USER, "entities");
		expect(entities.filter((e) => e.type === "personal")).toHaveLength(1);
		const wallets = await repo.list(USER, "assets");
		expect(wallets).toHaveLength(1);
		expect(wallets[0]).toMatchObject({ kind: "cash", name: "Personal Main Wallet", isDefault: true, balance: 0 });
	});

	it("keeps each user's book separate", async () => {
		await service.listEntities(USER);
		await service.listEntities(OTHER);
		expect(await repo.list(OTHER, "entities")).toHaveLength(1);
		expect((await repo.list(USER, "entities"))[0]?.id).not.toBe((await repo.list(OTHER, "entities"))[0]?.id);
	});
});

describe("entities", () => {
	it("creates a business entity with a zero default wallet dated to asOf", async () => {
		const acme = await createBusiness();

		const wallets = await service.listAssets(USER, { entityId: acme.id, kind: "cash" });
		expect(wallets).toHaveLength(1);
		expect(wallets[0]).toMatchObject({
			name: "Acme Main Wallet",
			balance: 0,
			balanceAsOf: "2026-03",
			isDefault: true,
			currency: "THB",
		});
	});

	it("refuses to create a personal entity", async () => {
		await expect(service.createEntity(USER, { name: "Second", type: "personal" })).rejects.toBeInstanceOf(
			ValidationError,
		);
	});

	it("deletes a business entity and cascades to its records", async () => {
		const acme = await createBusiness();
		await service.createIncome(USER, { kind: "business", entityId: acme.id, name: "Retainer", category: "freelance", amount: 1000 });
		await service.createExpense(USER, { entityId: acme.id, name: "Hosting", category: "subscription", amount: 50 });

		await service.deleteEntity(USER, acme.id);

		expect(await service.listAssets(USER, { entityId: acme.id })).toEqual([]);
		expect(await service.listIncomes(USER, { entityId: acme.id })).toEqual([]);
		expect(await service.listExpenses(USER, { entityId: acme.id })).toEqual([]);
		await expect(service.getEntity(USER, acme.id)).rejects.toBeInstanceOf(NotFoundError);
	});

	it("refuses to delete the personal entity", async () => {
		const me = await personalEntity();
		await expect(service.deleteEntity(USER, me.id)).rejects.toBeInstanceOf(ValidationError);
	});

	it("refuses to change an entity's type", async () => {
		const acme = await createBusiness();
		await expect(service.updateEntity(USER, acme.id, { type: "personal" })).rejects.toBeInstanceOf(ValidationError);
	});
});

describe("validation rules", () => {
	it("rejects an asset whose entity does not exist for this user", async () => {
		await expect(
			service.createAsset(USER, {
				kind: "cash",
				entityId: crypto.randomUUID(),
				name: "Ghost",
				category: "bank",
				active: true,
			}),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects an income that deposits into another entity's cash asset", async () => {
		const acme = await createBusiness();
		const acmeWallet = await defaultWallet(acme.id);
		const me = await personalEntity();

		await expect(
			service.createIncome(USER, {
				kind: "business",
				entityId: me.id,
				name: "Sale",
				category: "sales",
				amount: 100,
				depositAssetId: acmeWallet.id,
			}),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects an expense paid from both a cash asset and a card", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		const card = await service.createLiability(USER, {
			kind: "revolving",
			entityId: me.id,
			name: "Card",
			category: "credit_card",
			amount: 500,
			revolving: { balance: 0 },
		});

		await expect(
			service.createExpense(USER, {
				entityId: me.id,
				name: "Coffee",
				category: "food",
				amount: 3,
				paidFromAssetId: wallet.id,
				paidFromLiabilityId: card.id,
			}),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects an expense charged to a liability that is not revolving", async () => {
		const me = await personalEntity();
		const loan = await service.createLiability(USER, {
			kind: "loan",
			entityId: me.id,
			name: "Car",
			category: "car_loan",
			amount: 9000,
			loan: { principal: 500000, termMonths: 60, originatedOn: "2026-01" },
		});

		await expect(
			service.createExpense(USER, {
				entityId: me.id,
				name: "Fuel",
				category: "transport",
				amount: 40,
				paidFromLiabilityId: loan.id,
			}),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("defaults a loan without an amount to its level payment", async () => {
		const me = await personalEntity();
		const loan = await service.createLiability(USER, {
			kind: "loan",
			entityId: me.id,
			name: "Mortgage",
			category: "mortgage",
			loan: { principal: 1000000, annualRate: 0.065, termMonths: 240, originatedOn: "2026-01" },
		});
		expect(loan.amount).toBe(calculateLoanPayment(1000000, 0.065, 240));
	});

	it("rejects a transfer with two destinations", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		const acme = await createBusiness();

		await expect(
			service.createTransfer(USER, {
				amount: 100,
				date: "2026-10",
				fromAssetId: wallet.id,
				toAssetId: wallet.id,
				toEntityId: acme.id,
			}),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a transfer that has no destination", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);

		await expect(
			service.createTransfer(USER, { amount: 100, date: "2026-10", fromAssetId: wallet.id }),
		).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a transfer whose source and destination are the same asset", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);

		await expect(
			service.createTransfer(USER, { amount: 100, date: "2026-10", fromAssetId: wallet.id, toAssetId: wallet.id }),
		).rejects.toThrow("Source and destination must differ");
	});

	it("rejects a transfer from an entity that has no cash asset", async () => {
		const acme = await createBusiness();
		const wallet = await defaultWallet(acme.id);
		await service.deleteAsset(USER, wallet.id);
		const me = await personalEntity();

		await expect(
			service.createTransfer(USER, { amount: 100, date: "2026-10", fromEntityId: acme.id, toEntityId: me.id }),
		).rejects.toThrow("has no cash asset");
	});

	it("rejects a duplicate id with 409", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);

		await expect(
			service.createAsset(USER, { id: wallet.id, kind: "cash", entityId: me.id, name: "Dup", category: "bank" }),
		).rejects.toBeInstanceOf(DuplicateError);
	});

	it("rejects straight-line depreciation without a useful life", async () => {
		const me = await personalEntity();
		await expect(
			service.createAsset(USER, {
				kind: "fixed",
				entityId: me.id,
				name: "Laptop",
				category: "laptop",
				cost: 40000,
				acquiredOn: "2026-01",
			}),
		).rejects.toThrow("usefulLifeMonths is required");
	});

	it("rejects unsetting the only default cash asset", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);

		await expect(service.updateAsset(USER, wallet.id, { isDefault: false })).rejects.toBeInstanceOf(ValidationError);
	});

	it("rejects a version conflict with 409", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		await service.updateAsset(USER, wallet.id, { name: "Main", version: wallet.version });

		const stale = service.updateAsset(USER, wallet.id, { name: "Stale", version: wallet.version });
		await expect(stale).rejects.toBeInstanceOf(VersionConflictError);
		await expect(stale).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
	});
});

describe("default cash invariants", () => {
	it("makes an entity's first cash asset the default, whatever isDefault says", async () => {
		const acme = await createBusiness();
		const bank = await service.createAsset(USER, { kind: "cash", entityId: acme.id, name: "KBank", category: "bank", isDefault: false });
		expect(bank).toMatchObject({ kind: "cash", isDefault: false });
		expect((await defaultWallet(acme.id)).name).toBe("Acme Main Wallet");
	});

	it("keeps a later cash asset non-default when isDefault is false", async () => {
		const me = await personalEntity();
		const savings = await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Savings", category: "bank", isDefault: false });
		expect(savings).toMatchObject({ isDefault: false });
		expect((await defaultWallet(me.id)).name).toBe("Personal Main Wallet");
	});

	it("moves the default to a new asset and clears the previous one", async () => {
		const me = await personalEntity();
		const old = await defaultWallet(me.id);
		const savings = await service.createAsset(USER, {
			kind: "cash",
			entityId: me.id,
			name: "Savings",
			category: "bank",
			isDefault: true,
		});

		expect(await service.getAsset(USER, old.id)).toMatchObject({ isDefault: false });
		expect(await defaultWallet(me.id)).toMatchObject({ id: savings.id });
	});

	it("promotes the oldest remaining cash asset when the default is deleted", async () => {
		const me = await personalEntity();
		const first = await defaultWallet(me.id);
		const second = await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Second", category: "bank" });
		await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Third", category: "bank" });

		await service.deleteAsset(USER, first.id);

		expect(await defaultWallet(me.id)).toMatchObject({ id: second.id, isDefault: true });
	});

	it("moves the default when an asset is patched to isDefault", async () => {
		const me = await personalEntity();
		const first = await defaultWallet(me.id);
		const second = await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Second", category: "bank" });

		await service.updateAsset(USER, second.id, { isDefault: true });

		expect(await defaultWallet(me.id)).toMatchObject({ id: second.id });
		expect(await service.getAsset(USER, first.id)).toMatchObject({ isDefault: false });
	});
});

describe("career income", () => {
	it("creates the primary salary when none exists and salary > 0", async () => {
		const me = await personalEntity();

		const { income } = await service.setCareerIncome(USER, {
			entityId: me.id,
			salary: 50000,
			title: "Engineer",
			company: "Acme",
			paydayDayOfMonth: 25,
			startMonth: "2026-01",
		});

		expect(income).toMatchObject({
			kind: "employment",
			category: "salary",
			name: "Engineer",
			amount: 50000,
			cycle: "monthly",
			dayOfMonth: 25,
			startMonth: "2026-01",
			active: true,
			employment: { title: "Engineer", employer: "Acme" },
		});
	});

	it("updates only the primary income; a later promotion row is untouched", async () => {
		const me = await personalEntity();
		await service.setCareerIncome(USER, { entityId: me.id, salary: 50000, startMonth: "2026-01", endMonth: "2027-12" });
		const promotion = await service.createIncome(USER, {
			kind: "employment",
			entityId: me.id,
			name: "Senior promotion",
			category: "salary",
			amount: 60000,
			startMonth: "2026-06",
			dayOfMonth: 1,
		});

		const { income } = await service.setCareerIncome(USER, {
			entityId: me.id,
			salary: 55000,
			paydayDayOfMonth: 30,
			startMonth: "",
			endMonth: "",
		});

		expect(income).toMatchObject({ amount: 55000, dayOfMonth: 30, startMonth: "2026-01" });
		expect(income?.endMonth).toBeUndefined();
		expect(await service.getIncome(USER, promotion.id)).toMatchObject({ amount: 60000, dayOfMonth: 1, startMonth: "2026-06" });
	});

	it("a salary of 0 deactivates the primary income, and with none it returns null", async () => {
		const me = await personalEntity();
		await service.setCareerIncome(USER, { entityId: me.id, salary: 50000, startMonth: "2026-01" });

		const { income } = await service.setCareerIncome(USER, { entityId: me.id, salary: 0 });
		expect(income).toMatchObject({ amount: 0, active: false });

		const acme = await createBusiness();
		expect(await service.setCareerIncome(USER, { entityId: acme.id, salary: 0 })).toEqual({ income: null });
	});
});

describe("asset purchases", () => {
	it("buys a fixed asset from cash in one write and the summary's cash drops by the cost", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		await service.updateAsset(USER, wallet.id, { balance: 100000, balanceAsOf: "2026-01" });
		const cashValue = async () =>
			(await service.getSummary(USER, { month: "2026-10" })).entities.find((e) => e.entityId === me.id)?.metrics
				.cashAssetsValue;
		const before = await cashValue();

		const laptop = await service.createAsset(USER, {
			kind: "fixed",
			entityId: me.id,
			name: "Laptop",
			category: "laptop",
			cost: 30000,
			acquiredOn: "2026-02-01",
			usefulLifeMonths: 36,
			paidFrom: {},
		});

		expect(await service.listTransfers(USER)).toEqual([
			expect.objectContaining({ fromAssetId: wallet.id, toAssetId: laptop.id, amount: 30000, date: "2026-02-01" }),
		]);
		expect(await cashValue()).toBe((before ?? 0) - 30000);
	});

	it("finances a fixed asset with a loan liability", async () => {
		const me = await personalEntity();
		const house = await service.createAsset(USER, {
			kind: "fixed",
			entityId: me.id,
			name: "Condo",
			category: "property",
			cost: 1200000,
			acquiredOn: "2026-03-10",
			depreciationMethod: "none",
			financing: { principal: 1000000, annualRate: 0.065, termMonths: 240, amount: 7000 },
		});

		const loans = await service.listLiabilities(USER, { kind: "loan" });
		expect(loans).toHaveLength(1);
		expect(loans[0]).toMatchObject({
			name: "Condo loan",
			category: "loan",
			amount: 7000,
			startMonth: "2026-03",
			loan: { principal: 1000000, annualRate: 0.065, termMonths: 240, originatedOn: "2026-03-10", financedAssetId: house.id },
		});
	});

	it("resolves a transfer's entity shortcuts to the default cash assets", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		const savings = await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Savings", category: "bank" });
		const acme = await createBusiness();
		const acmeWallet = await defaultWallet(acme.id);

		const outgoing = await service.createTransfer(USER, { amount: 500, date: "2026-10", fromEntityId: me.id, toAssetId: savings.id });
		const incoming = await service.createTransfer(USER, { amount: 300, date: "2026-10", fromAssetId: savings.id, toEntityId: acme.id });

		expect(outgoing).toMatchObject({ fromAssetId: wallet.id, toAssetId: savings.id });
		expect(incoming).toMatchObject({ fromAssetId: savings.id, toAssetId: acmeWallet.id });
	});
});

describe("computed reads", () => {
	it("adds a balance sheet to each entity and to the consolidated summary", async () => {
		const me = await personalEntity();
		await service.createAsset(USER, {
			kind: "fixed",
			entityId: me.id,
			name: "Condo",
			category: "property",
			cost: 1200000,
			acquiredOn: "2026-01-10",
			depreciationMethod: "none",
			financing: { principal: 1000000, annualRate: 0.06, termMonths: 240, originatedOn: "2026-01-10", amount: 7000 },
		});

		const summary = await service.getSummary(USER, { month: "2026-01" });
		const personal = summary.entities.find((e) => e.entityId === me.id);
		if (!personal) throw new Error("personal entity missing from summary");

		// Interest accrues on the opening balance for the origination month.
		const debt = 1000000 + 5000 - 7000;
		expect(personal.balanceSheet.fixedAssets).toBe(1200000);
		expect(personal.balanceSheet.debt).toBeCloseTo(debt, 2);
		expect(personal.balanceSheet.totalAssets).toBe(
			personal.balanceSheet.cash + personal.balanceSheet.fixedAssets + personal.balanceSheet.investments,
		);
		expect(personal.balanceSheet.netWorth).toBeCloseTo(personal.balanceSheet.totalAssets - personal.balanceSheet.debt, 2);
		expect(summary.consolidated.balanceSheet).toEqual(personal.balanceSheet);
	});

	it("feeds the cash-flow totals from the ledger and keeps them under the direction filter", async () => {
		const me = await personalEntity();
		const wallet = await defaultWallet(me.id);
		const savings = await service.createAsset(USER, { kind: "cash", entityId: me.id, name: "Savings", category: "bank" });
		await service.createIncome(USER, {
			entityId: me.id,
			kind: "employment",
			category: "salary",
			name: "Salary",
			amount: 50000,
			startMonth: "2026-01",
			asOf: "2026-01-15",
		});
		await service.createExpense(USER, {
			entityId: me.id,
			name: "Rent",
			category: "housing",
			amount: 12000,
			startMonth: "2026-01",
			paidFromAssetId: wallet.id,
		});
		const card = await service.createLiability(USER, {
			kind: "revolving",
			entityId: me.id,
			name: "Card",
			category: "credit_card",
			amount: 500,
			revolving: { creditLimit: 50000, balance: 0, balanceAsOf: "2026-01" },
		});
		await service.createExpense(USER, {
			entityId: me.id,
			name: "Streaming",
			category: "entertainment",
			amount: 300,
			startMonth: "2026-01",
			paidFromLiabilityId: card.id,
		});
		await service.createTransfer(USER, { amount: 5000, date: "2026-03-05", fromEntityId: me.id, toAssetId: savings.id });

		const all = await service.getCashFlows(USER, { month: "2026-03" });
		const out = await service.getCashFlows(USER, { month: "2026-03", direction: "out" });
		const ledger = await service.getLedger(USER, "2026-03", me.id);

		expect(all.entityId).toBe(me.id);
		expect(all.totals.moneyIn).toBe(ledger.summary.totalInflow);
		expect(all.totals.moneyOut).toBe(ledger.summary.totalCashOutflow);
		expect(all.items.some((item) => item.isCash === false && item.chargedToLiabilityId === card.id)).toBe(true);
		expect(out.items.every((item) => item.direction === "out")).toBe(true);
		expect(out.items.length).toBeLessThan(all.items.length);
		expect(out.totals).toEqual(all.totals);
	});

	it("includes depreciation only when asked and 404s on an unknown entity", async () => {
		const me = await personalEntity();
		await service.createAsset(USER, {
			kind: "fixed",
			entityId: me.id,
			name: "Laptop",
			category: "laptop",
			cost: 36000,
			acquiredOn: "2026-01",
			usefulLifeMonths: 36,
		});

		const without = await service.getCashFlows(USER, { month: "2026-02" });
		const withDep = await service.getCashFlows(USER, { month: "2026-02", includeDepreciation: "true" });
		expect(without.items.some((item) => item.flowType === "depreciation")).toBe(false);
		expect(withDep.items.some((item) => item.flowType === "depreciation")).toBe(true);
		expect(withDep.totals.moneyOut).toBe(without.totals.moneyOut);

		await expect(service.getCashFlows(USER, { month: "2026-02", entityId: "missing" })).rejects.toBeInstanceOf(NotFoundError);
	});

	it("schedules a loan to its payoff month by default, counting extra payments", async () => {
		const me = await personalEntity();
		const loan = await service.createLiability(USER, {
			kind: "loan",
			entityId: me.id,
			name: "Phone plan",
			category: "loan",
			loan: { principal: 10000, annualRate: 0, termMonths: 10, originatedOn: "2026-01" },
		});
		await service.createTransfer(USER, { amount: 20000, date: "2026-02-10", fromEntityId: me.id, toLiabilityId: loan.id });

		const schedule = await service.getLiabilitySchedule(USER, loan.id, {});
		expect(schedule.kind).toBe("loan");
		if (schedule.kind !== "loan") throw new Error("expected a loan schedule");
		expect(schedule.entries.map((e) => e.yearMonth)).toEqual(["2026-01", "2026-02"]);
		expect(schedule.entries[1]).toMatchObject({ payment: 1000, extra: 8000, closing: 0 });
	});

	it("runs a loan schedule to the end of its term when it is not paid off early", async () => {
		const me = await personalEntity();
		const loan = await service.createLiability(USER, {
			kind: "loan",
			entityId: me.id,
			name: "Mortgage",
			category: "mortgage",
			loan: { principal: 120000, annualRate: 0.12, termMonths: 12, originatedOn: "2026-01" },
		});

		const schedule = await service.getLiabilitySchedule(USER, loan.id, {});
		if (schedule.kind !== "loan") throw new Error("expected a loan schedule");
		expect(schedule.entries).toHaveLength(12);
		expect(schedule.entries[11]?.yearMonth).toBe("2026-12");

		const partial = await service.getLiabilitySchedule(USER, loan.id, { through: "2026-03" });
		if (partial.kind !== "loan") throw new Error("expected a loan schedule");
		expect(partial.entries.map((e) => e.yearMonth)).toEqual(["2026-01", "2026-02", "2026-03"]);
	});

	it("schedules a revolving balance month by month", async () => {
		const me = await personalEntity();
		const card = await service.createLiability(USER, {
			kind: "revolving",
			entityId: me.id,
			name: "Card",
			category: "credit_card",
			amount: 1000,
			revolving: { creditLimit: 50000, balance: 2000, balanceAsOf: "2026-01", annualRate: 0.18 },
		});

		const schedule = await service.getLiabilitySchedule(USER, card.id, { through: "2026-03" });
		expect(schedule.kind).toBe("revolving");
		if (schedule.kind !== "revolving") throw new Error("expected a revolving schedule");
		expect(schedule.entries.map((e) => e.yearMonth)).toEqual(["2026-01", "2026-02", "2026-03"]);
		expect(schedule.entries[0]).toMatchObject({ opening: 2000, interest: 30 });
	});

	it("refuses a schedule for an other-kind liability and 404s on an unknown one", async () => {
		const me = await personalEntity();
		const other = await service.createLiability(USER, {
			kind: "other",
			entityId: me.id,
			name: "Tax owed",
			category: "tax",
			amount: 500,
		});

		await expect(service.getLiabilitySchedule(USER, other.id, {})).rejects.toThrow("This liability has no schedule");
		await expect(service.getLiabilitySchedule(USER, "missing", {})).rejects.toBeInstanceOf(NotFoundError);
	});
});


describe("PATCH clearing", () => {
	it("null clears an optional field, undefined keeps it", async () => {
		const me = await personalEntity();
		const expense = await service.createExpense(USER, {
			entityId: me.id,
			name: "Gym",
			category: "health",
			amount: 1500,
			notes: "annual plan",
			endMonth: "2027-06",
		});

		const kept = await service.updateExpense(USER, expense.id, { amount: 1600 });
		expect(kept.notes).toBe("annual plan");

		const cleared = await service.updateExpense(USER, expense.id, { notes: null, endMonth: null });
		expect(cleared.notes).toBeUndefined();
		expect(cleared.endMonth).toBeUndefined();
		expect(cleared.amount).toBe(1600);
	});
});
