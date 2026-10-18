import { describe, expect, it } from "vitest";
import {
	buildMonthlyActions,
	calculateCashAssetBalance,
	calculateCurrentTreasury,
	calculateEntityMonthlyCashFlow,
	calculateEntityMonthlyOperatingCash,
	liabilityPaymentInMonth,
	revenueMonthlyAmount,
} from "../src/ledger";
import { calculateAssetDepreciation, isCashAsset } from "../src/math";
import type {
	Asset,
	CapitalTransfer,
	EntityAccount,
	Expense,
	Income,
	Liability,
} from "../src/types";

const YM = "2026-10";

const personal: EntityAccount = { id: "acc_p", name: "Me", type: "personal", cashReserve: 0, currency: "THB" };
const business: EntityAccount = { id: "acc_b", name: "Biz", type: "business", cashReserve: 0, currency: "THB" };

function cashWallet(overrides: Partial<Asset> & { id: string; entityId: string; cost: number }): Asset {
	return {
		name: overrides.id,
		lifespanMonths: 0,
		purchaseDate: "2026-10",
		category: "cash",
		kind: "cash",
		...overrides,
	} as Asset;
}

function income(overrides: Partial<Income> & { id: string; amount: number }): Income {
	return {
		entityId: "acc_p",
		name: overrides.id,
		frequency: "monthly",
		source: "stripe",
		active: true,
		...overrides,
	} as Income;
}

function expense(overrides: Partial<Expense> & { id: string; amount: number }): Expense {
	return {
		entityId: "acc_p",
		name: overrides.id,
		cycle: "monthly",
		category: "tools",
		nextRenewalDate: "2026-10-10",
		active: true,
		...overrides,
	} as Expense;
}

function liability(overrides: Partial<Liability> & { id: string; amount: number }): Liability {
	return {
		entityId: "acc_p",
		name: overrides.id,
		category: "other",
		active: true,
		...overrides,
	} as Liability;
}

function transfer(overrides: Partial<CapitalTransfer> & { id: string; amount: number }): CapitalTransfer {
	return {
		fromEntityId: "acc_b",
		toEntityId: "acc_b",
		date: "2026-10-05",
		note: "",
		...overrides,
	} as CapitalTransfer;
}

describe("per-wallet cash (links)", () => {
	const hardware: Asset[] = [
		cashWallet({ id: "w_main", entityId: "acc_p", cost: 1000, isDefault: true }),
		cashWallet({ id: "w_sav", entityId: "acc_p", cost: 500 }),
	];

	it("income deposited to a non-default wallet lands there; the entity total is unchanged", () => {
		const revenues = [income({ id: "rev_fee", amount: 300, depositAssetId: "w_sav" })];
		const args = { account: personal, hardware, transfers: [], revenues, subscriptions: [], liabilities: [], yearMonth: YM };

		const sav = calculateCashAssetBalance({ ...args, asset: hardware[1]! });
		const main = calculateCashAssetBalance({ ...args, asset: hardware[0]! });
		expect(sav.netOperatingCash).toBe(300);
		expect(sav.effectiveBalance).toBe(800);
		expect(main.netOperatingCash).toBe(0);
		expect(main.effectiveBalance).toBe(1000);

		const unlinked = [income({ id: "rev_fee", amount: 300 })];
		expect(calculateCurrentTreasury({ ...args, revenues: unlinked })).toBe(1800);
		expect(calculateCurrentTreasury({ ...args, revenues })).toBe(1800);
	});

	it("an expense paid from a non-default wallet leaves that wallet", () => {
		const subscriptions = [expense({ id: "sub_tool", amount: 100, paidFromAssetId: "w_sav" })];
		const args = { account: personal, hardware, transfers: [], revenues: [], subscriptions, liabilities: [], yearMonth: YM };

		expect(calculateCashAssetBalance({ ...args, asset: hardware[1]! }).effectiveBalance).toBe(400);
		expect(calculateCashAssetBalance({ ...args, asset: hardware[0]! }).effectiveBalance).toBe(1000);
		expect(calculateCurrentTreasury(args)).toBe(1400);
	});

	it("a flow linked to a wallet is attributed to it in the mid-month baseline correction", () => {
		// The wallet's balance was recorded on the 15th, so the 1st's deposit is already in it.
		const midMonth: Asset[] = [
			cashWallet({ id: "w_main", entityId: "acc_p", cost: 1000, isDefault: true }),
			cashWallet({ id: "w_sav", entityId: "acc_p", cost: 800, purchaseDate: "2026-10-15" }),
		];
		const revenues = [income({ id: "rev_fee", amount: 300, depositAssetId: "w_sav" })];
		const result = calculateCashAssetBalance({
			asset: midMonth[1]!,
			hardware: midMonth,
			transfers: [],
			account: personal,
			revenues,
			subscriptions: [],
			liabilities: [],
			yearMonth: YM,
		});
		expect(result.netOperatingCash).toBe(0);
		expect(result.effectiveBalance).toBe(800);
	});
});

describe("transfers by target and source kind", () => {
	const hardware: Asset[] = [
		cashWallet({ id: "w_b", entityId: "acc_b", cost: 2000, isDefault: true }),
		{
			id: "hw_laptop",
			entityId: "acc_b",
			name: "Laptop",
			cost: 1200,
			lifespanMonths: 36,
			purchaseDate: "2026-10",
			category: "laptop",
			kind: "fixed",
		},
		{
			id: "hw_fund",
			entityId: "acc_b",
			name: "Index fund",
			cost: 5000,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "other",
			kind: "investment",
			investment: { instrument: "ETF", costBasis: 5000, marketValue: 5000, valuedAsOf: "2026-10" },
		},
	];
	const base = { account: business, hardware, subscriptions: [], revenues: [], liabilities: [], yearMonth: YM };

	it("cash to a fixed asset leaves the entity and is an asset purchase, not an inflow", () => {
		const transfers = [transfer({ id: "tx_laptop", amount: 1200, note: "Laptop", targetAssetId: "hw_laptop" })];
		expect(calculateCurrentTreasury({ ...base, transfers })).toBe(800);

		const { actions, totalInflow, totalCashOutflow } = buildMonthlyActions({ ...base, transfers });
		expect(actions.some((a) => a.id === "tx_laptop" && a.direction === "inflow")).toBe(false);
		const outflow = actions.find((a) => a.id === "tx_laptop");
		expect(outflow?.flowType).toBe("asset_purchase");
		expect(outflow?.cashAssetId).toBeUndefined();
		expect(totalInflow).toBe(0);
		expect(totalCashOutflow).toBe(1200);
	});

	it("cash to an investment is an investment outflow; selling it back to cash raises the treasury", () => {
		const buy = [transfer({ id: "tx_buy", amount: 1000, note: "Buy", targetAssetId: "hw_fund", date: "2026-10-07" })];
		expect(calculateCurrentTreasury({ ...base, transfers: buy })).toBe(1000);
		const buyActions = buildMonthlyActions({ ...base, transfers: buy }).actions;
		expect(buyActions.find((a) => a.id === "tx_buy")?.flowType).toBe("investment");
		expect(buyActions.some((a) => a.id === "tx_buy" && a.direction === "inflow")).toBe(false);

		const sell = [
			transfer({ id: "tx_sell", amount: 800, note: "Sell", fromAssetId: "hw_fund", targetAssetId: "w_b", date: "2026-10-20" }),
		];
		expect(calculateCurrentTreasury({ ...base, transfers: sell })).toBe(2800);
		const sellActions = buildMonthlyActions({ ...base, transfers: sell }).actions;
		expect(sellActions.some((a) => a.id === "tx_sell" && a.direction === "outflow")).toBe(false);
		const inflow = sellActions.find((a) => a.id === "tx_sell");
		expect(inflow?.flowType).toBe("investment");
		expect(inflow?.cashAssetId).toBe("w_b");
	});

	it("a transfer to a liability is a cash outflow typed as a debt payment", () => {
		const transfers = [transfer({ id: "tx_card", amount: 500, note: "Card payoff", toLiabilityId: "liab_card", date: "2026-10-12" })];
		expect(calculateCurrentTreasury({ ...base, transfers })).toBe(1500);
		const { actions, totalInflow, totalCashOutflow } = buildMonthlyActions({ ...base, transfers });
		expect(actions.find((a) => a.id === "tx_card")?.flowType).toBe("debt_payment");
		expect(totalInflow).toBe(0);
		expect(totalCashOutflow).toBe(500);
	});

	it("depreciation keeps its own flow type and never moves cash", () => {
		const { actions } = buildMonthlyActions({ ...base, transfers: [] });
		const dep = actions.find((a) => a.id === "action_dep_hw_laptop");
		expect(dep?.category).toBe("asset_depreciation");
		expect(dep?.flowType).toBe("depreciation");
		expect(calculateCurrentTreasury({ ...base, transfers: [] })).toBe(2000);
	});
});

describe("card-charged expenses", () => {
	const hardware: Asset[] = [cashWallet({ id: "w_p", entityId: "acc_p", cost: 1000, isDefault: true })];
	// Not due in October, so it adds no ledger action of its own.
	const card = liability({ id: "liab_card", amount: 0, kind: "revolving", startMonth: "2027-01" });

	it("is excluded from operating cash and the ledger when it is charged to a liability", () => {
		const subscriptions = [expense({ id: "sub_cloud", amount: 200, paidFromLiabilityId: "liab_card" })];
		const op = calculateEntityMonthlyOperatingCash({
			account: personal,
			revenues: [],
			subscriptions,
			liabilities: [card],
			yearMonth: YM,
		});
		expect(op.totalExpense).toBe(0);

		const { actions, totalCashOutflow } = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions,
			hardware,
			revenues: [],
			transfers: [],
			liabilities: [card],
		});
		expect(actions.find((a) => a.id === "sub_cloud")).toBeUndefined();
		expect(totalCashOutflow).toBe(0);
		expect(calculateEntityMonthlyCashFlow({ account: personal, transfers: [], subscriptions, liabilities: [card], hardware, yearMonth: YM }).outflow).toBe(0);
	});

	it("the same expense without the card link is cash", () => {
		const subscriptions = [expense({ id: "sub_cloud", amount: 200 })];
		const op = calculateEntityMonthlyOperatingCash({
			account: personal,
			revenues: [],
			subscriptions,
			liabilities: [card],
			yearMonth: YM,
		});
		expect(op.totalExpense).toBe(200);

		const { actions, totalCashOutflow } = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions,
			hardware,
			revenues: [],
			transfers: [],
			liabilities: [card],
		});
		expect(actions.find((a) => a.id === "sub_cloud")?.flowType).toBe("expense");
		expect(totalCashOutflow).toBe(200);
	});
});

describe("cycles and due days", () => {
	it("income: quarterly and weekly are converted to a monthly equivalent", () => {
		expect(revenueMonthlyAmount(income({ id: "q", amount: 900, frequency: "quarterly" }))).toBe(300);
		expect(revenueMonthlyAmount(income({ id: "w", amount: 100, frequency: "weekly" }))).toBe(433.33);
		expect(revenueMonthlyAmount(income({ id: "y", amount: 1200, frequency: "yearly" }))).toBe(100);
		expect(revenueMonthlyAmount(income({ id: "m", amount: 1000, frequency: "monthly" }))).toBe(1000);

		const op = calculateEntityMonthlyOperatingCash({
			account: personal,
			revenues: [income({ id: "q", amount: 900, frequency: "quarterly" }), income({ id: "w", amount: 100, frequency: "weekly" })],
			subscriptions: [],
			yearMonth: YM,
		});
		expect(op.totalIncome).toBe(733.33);
	});

	it("income: an explicit dayOfMonth sets the action date", () => {
		const { actions } = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [],
			hardware: [],
			revenues: [income({ id: "rev_day", amount: 1000, dayOfMonth: 25 })],
			transfers: [],
			liabilities: [],
		});
		expect(actions.find((a) => a.id === "rev_day")?.date).toBe("2026-10-25");
	});

	it("liability: yearly cycle pays its monthly equivalent on dayOfMonth", () => {
		const insurance = liability({ id: "liab_ins", amount: 1200, cycle: "yearly", dayOfMonth: 8, startMonth: "2026-01" });
		expect(liabilityPaymentInMonth(insurance, YM)).toBe(100);

		const { actions, totalCashOutflow } = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [],
			hardware: [],
			revenues: [],
			transfers: [],
			liabilities: [insurance],
		});
		const action = actions.find((a) => a.id === "liab_ins");
		expect(action?.date).toBe("2026-10-08");
		expect(action?.amount).toBe(100);
		expect(action?.flowType).toBe("debt_payment");
		expect(totalCashOutflow).toBe(100);
	});

	it("liability: a one_time payment is due only in its start month", () => {
		const once = liability({ id: "liab_once", amount: 750, cycle: "one_time", startMonth: "2026-10" });
		expect(liabilityPaymentInMonth(once, "2026-10")).toBe(750);
		expect(liabilityPaymentInMonth(once, "2026-11")).toBe(0);

		const args = {
			account: personal,
			subscriptions: [],
			hardware: [],
			revenues: [],
			transfers: [],
			liabilities: [once],
		};
		const oct = buildMonthlyActions({ ...args, yearMonth: "2026-10" });
		expect(oct.actions.find((a) => a.id === "liab_once")?.date).toBe("2026-10-15");
		expect(oct.totalCashOutflow).toBe(750);
		const nov = buildMonthlyActions({ ...args, yearMonth: "2026-11" });
		expect(nov.actions.find((a) => a.id === "liab_once")).toBeUndefined();
		expect(nov.totalCashOutflow).toBe(0);
	});
});

describe("classification with kind and depreciationMethod", () => {
	const base = { id: "a", entityId: "acc_b", name: "A", purchaseDate: "2026-01", salvageValue: 0 };

	it("kind decides cash vs non-cash when present", () => {
		expect(isCashAsset({ ...base, cost: 100, lifespanMonths: 36, category: "other", kind: "cash" })).toBe(true);
		expect(isCashAsset({ ...base, cost: 100, lifespanMonths: 0, category: "cash", kind: "fixed" })).toBe(false);
		// Without kind the legacy rule still applies.
		expect(isCashAsset({ ...base, cost: 100, lifespanMonths: 36, category: "laptop" })).toBe(false);
		expect(isCashAsset({ ...base, cost: 100, lifespanMonths: 0, category: "other" })).toBe(true);
	});

	it("a fixed asset without a positive lifespan does not depreciate (and never divides by zero)", () => {
		const noLife = calculateAssetDepreciation({ ...base, cost: 1200, lifespanMonths: 0, category: "laptop", kind: "fixed" }, YM);
		expect(noLife).toEqual({
			monthlyRate: 0,
			elapsedMonths: 0,
			remainingMonths: 0,
			monthsRemaining: 0,
			remainingBookValue: 1200,
			isFullyDepreciated: false,
			completionDate: "N/A",
		});
		const negative = calculateAssetDepreciation({ ...base, cost: 1200, lifespanMonths: -12, category: "laptop", kind: "fixed" }, YM);
		expect(negative.remainingBookValue).toBe(1200);
		expect(Number.isFinite(negative.monthlyRate)).toBe(true);
	});

	it("investments and depreciationMethod none (land) do not depreciate", () => {
		const land = calculateAssetDepreciation({ ...base, cost: 80000, lifespanMonths: 120, category: "other", kind: "fixed", depreciationMethod: "none" }, YM);
		expect(land).toEqual({
			monthlyRate: 0,
			elapsedMonths: 0,
			remainingMonths: 0,
			monthsRemaining: 0,
			remainingBookValue: 80000,
			isFullyDepreciated: false,
			completionDate: "N/A",
		});

		const fund = calculateAssetDepreciation({ ...base, cost: 5000, lifespanMonths: 60, category: "other", kind: "investment" }, YM);
		expect(fund.monthlyRate).toBe(0);
		expect(fund.remainingBookValue).toBe(5000);
		expect(fund.completionDate).toBe("N/A");
	});

	it("a straight-line fixed asset still depreciates", () => {
		const laptop = calculateAssetDepreciation({ ...base, cost: 1200, lifespanMonths: 36, category: "laptop", kind: "fixed", purchaseDate: "2026-10" }, YM);
		expect(laptop.monthlyRate).toBe(33.33);
	});
});
