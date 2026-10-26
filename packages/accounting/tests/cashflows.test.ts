import { describe, expect, it } from "vitest";
import { buildCashFlows, summarizeCashFlows, summarizeSpendingByCategory } from "../src/cashflows";
import { buildMonthlyActions } from "../src/ledger";
import type { Asset, CapitalTransfer, EntityAccount, Expense, Income, Liability } from "../src/types";

const YM = "2026-10";

const personal: EntityAccount = { id: "acc_p", name: "Me", type: "personal", cashReserve: 0, currency: "THB" };

const hardware: Asset[] = [
	{ id: "w_main", entityId: "acc_p", name: "Main", cost: 5000, lifespanMonths: 0, purchaseDate: YM, category: "cash", kind: "cash", isDefault: true },
	{ id: "w_sav", entityId: "acc_p", name: "Savings", cost: 1000, lifespanMonths: 0, purchaseDate: YM, category: "cash", kind: "cash" },
	// Bought in October for 1200, 12-month life: 100 depreciation a month.
	{ id: "laptop", entityId: "acc_p", name: "Laptop", cost: 1200, lifespanMonths: 12, purchaseDate: YM, category: "laptop", kind: "fixed" },
	{
		id: "inv_etf",
		entityId: "acc_p",
		name: "ETF",
		cost: 4000,
		lifespanMonths: 0,
		purchaseDate: YM,
		category: "stock",
		kind: "investment",
		investment: { instrument: "ETF", costBasis: 4000, marketValue: 5000, valuedAsOf: YM, expectedAnnualReturn: 0 },
	},
];

const revenues: Income[] = [
	{ id: "rev_fee", entityId: "acc_p", name: "Client fee", amount: 3000, frequency: "monthly", source: "stripe", active: true, startMonth: YM, dayOfMonth: 25, depositAssetId: "w_main" },
];

const subscriptions: Expense[] = [
	{ id: "sub_tools", entityId: "acc_p", name: "Tools", amount: 200, cycle: "monthly", category: "tools", nextRenewalDate: "2026-10-03", active: true, paidFromAssetId: "w_main" },
	// Charged to the card: no cash moves now.
	{ id: "sub_ai", entityId: "acc_p", name: "AI tool", amount: 300, cycle: "monthly", category: "tools", nextRenewalDate: "2026-10-10", active: true, paidFromLiabilityId: "card_1" },
];

const liabilities: Liability[] = [
	// Loan 100000 at 12%/yr over 12 months: October interest 1000, payment 8884.88.
	{
		id: "loan_house",
		entityId: "acc_p",
		name: "Mortgage",
		amount: 8884.88,
		category: "mortgage",
		kind: "loan",
		active: true,
		cycle: "monthly",
		startMonth: YM,
		loan: { principal: 100000, annualRate: 0.12, termMonths: 12, originatedOn: "2026-10-01" },
	},
	// Card with a 500 minimum payment; the 300 subscription above is charged to it.
	{
		id: "card_1",
		entityId: "acc_p",
		name: "Card",
		amount: 500,
		category: "credit_card",
		kind: "revolving",
		active: true,
		cycle: "monthly",
		startMonth: YM,
		revolving: { balance: 0, balanceAsOf: YM, annualRate: 0 },
	},
];

const transfers: CapitalTransfer[] = [
	// Cash to the laptop: asset purchase.
	{ id: "tx_laptop", fromEntityId: "acc_p", toEntityId: "acc_p", amount: 1200, date: "2026-10-12", note: "", fromAssetId: "w_main", targetAssetId: "laptop" },
	// Savings into the ETF: investment.
	{ id: "tx_invest", fromEntityId: "acc_p", toEntityId: "acc_p", amount: 500, date: "2026-10-15", note: "", fromAssetId: "w_sav", targetAssetId: "inv_etf" },
	// Withdrawal from the ETF into savings: investment in.
	{ id: "tx_withdraw", fromEntityId: "acc_p", toEntityId: "acc_p", amount: 800, date: "2026-10-28", note: "", fromAssetId: "inv_etf", targetAssetId: "w_sav" },
];

const args = { account: personal, yearMonth: YM, subscriptions, hardware, revenues, transfers, liabilities };

describe("buildCashFlows", () => {
	it("maps every movement to its flow type", () => {
		const items = buildCashFlows({ ...args, includeDepreciation: true });
		const byId = new Map(items.map((i) => [i.id, i]));

		expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
		expect(byId.get("in:rev_fee")).toMatchObject({ flowType: "income", direction: "in", amount: 3000, spendingAmount: 0, isCash: true });
		expect(byId.get("out:sub_tools")).toMatchObject({ flowType: "expense", direction: "out", amount: 200, spendingAmount: 200, isCash: true });
		expect(byId.get("card:sub_ai")).toMatchObject({
			flowType: "expense",
			direction: "out",
			amount: 300,
			isCash: false,
			spendingAmount: 300,
			chargedToLiabilityId: "card_1",
		});
		expect(byId.get("out:loan_house")).toMatchObject({
			flowType: "debt_payment",
			amount: 8884.88,
			interest: 1000,
			principal: 7884.88,
			spendingAmount: 1000,
		});
		// The card owes only this month's 300 charge, so it pays 300 of its 500 plan.
		expect(byId.get("out:card_1")).toMatchObject({ flowType: "debt_payment", amount: 300, spendingAmount: 0 });
		expect(byId.get("out:tx_laptop")).toMatchObject({ flowType: "asset_purchase", amount: 1200, spendingAmount: 0 });
		expect(byId.get("out:tx_invest")).toMatchObject({ flowType: "investment", amount: 500, spendingAmount: 0 });
		expect(byId.get("in:tx_withdraw")).toMatchObject({ flowType: "investment", direction: "in", amount: 800, spendingAmount: 0 });
		expect(byId.get("out:action_dep_laptop")).toMatchObject({
			flowType: "depreciation",
			isCash: false,
			amount: 100,
			spendingAmount: 100,
			sourceType: "asset",
			sourceId: "laptop",
		});
	});

	it("is sorted by date and omits depreciation unless asked", () => {
		const items = buildCashFlows(args);
		const dates = items.map((i) => i.date);
		expect(dates).toEqual([...dates].sort());
		expect(items.some((i) => i.flowType === "depreciation")).toBe(false);
	});

	it("summarizes spending and the cash totals", () => {
		// Money in: fee 3000 + withdrawal 800 = 3800.
		// Money out: tools 200 + mortgage 8884.88 + card 300 + laptop 1200 + ETF 500 = 11084.88.
		// Spending: tools 200 + card charge 300 + mortgage interest 1000 + depreciation 100 = 1600.
		expect(summarizeCashFlows(buildCashFlows({ ...args, includeDepreciation: true }))).toEqual({
			moneyIn: 3800,
			moneyOut: 11084.88,
			spending: 1600,
			adjustments: 0,
		});
		expect(summarizeCashFlows(buildCashFlows(args)).spending).toBe(1500);
	});

	it("cash totals match the ledger's inflow and outflow", () => {
		const ledger = buildMonthlyActions(args);
		const summary = summarizeCashFlows(buildCashFlows({ ...args, includeDepreciation: true }));
		expect(summary.moneyIn).toBe(ledger.totalInflow);
		expect(summary.moneyOut).toBe(ledger.totalCashOutflow);
	});
});


describe("spending by category (#173)", () => {
	const wallet: Asset = {
		id: "w_main",
		entityId: "acc_p",
		name: "Main",
		cost: 0,
		lifespanMonths: 0,
		purchaseDate: YM,
		category: "cash",
		kind: "cash",
		isDefault: true,
	};

	function argsFor(categories: string[]) {
		return {
			account: personal,
			yearMonth: YM,
			subscriptions: categories.map((category, index) => ({
				id: `sub_${index}`,
				entityId: "acc_p",
				name: `Item ${index}`,
				amount: 100,
				cycle: "monthly" as const,
				category,
				nextRenewalDate: "2026-10-05",
				active: true,
			})),
			hardware: [wallet],
			revenues: [],
			transfers: [],
		};
	}

	it("reads a Thai label and an app key into the same bucket", () => {
		const items = buildCashFlows(argsFor(["อาหาร", "food"]));
		expect(items.every((item) => item.category === "food")).toBe(true);

		const buckets = summarizeSpendingByCategory(items);
		expect(buckets.find((bucket) => bucket.category === "food")).toEqual({
			category: "food",
			spending: 200,
			count: 2,
			share: 1,
		});
	});

	it("always includes uncategorised, and the buckets sum to totals.spending", () => {
		const items = buildCashFlows(argsFor(["food", "unknown free text"]));
		const buckets = summarizeSpendingByCategory(items);
		expect(buckets.some((bucket) => bucket.category === "uncategorised")).toBe(true);
		expect(buckets.find((bucket) => bucket.category === "other")?.spending).toBe(100);
		const sum = buckets.reduce((total, bucket) => total + bucket.spending, 0);
		expect(sum).toBe(summarizeCashFlows(items).spending);
	});

	it("puts depreciation, which has no user category, into uncategorised", () => {
		const items = buildCashFlows({ ...args, includeDepreciation: true });
		const buckets = summarizeSpendingByCategory(items);
		const sum = buckets.reduce((total, bucket) => total + bucket.spending, 0);
		expect(sum).toBe(summarizeCashFlows(items).spending);
		expect(buckets.find((bucket) => bucket.category === "uncategorised")?.count).toBeGreaterThan(0);
	});

	it("returns only uncategorised at zero for an empty month", () => {
		const buckets = summarizeSpendingByCategory([]);
		expect(buckets).toEqual([{ category: "uncategorised", spending: 0, count: 0, share: 0 }]);
	});
});
