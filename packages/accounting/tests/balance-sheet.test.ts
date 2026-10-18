import { describe, expect, it } from "vitest";
import { calculateConsolidatedBalanceSheet, calculateEntityBalanceSheet } from "../src/balance-sheet";
import type { Account, Asset, Income, Liability } from "../src/types";

const YM = "2026-10";

const personal: Account = { id: "acc_p", name: "Me", type: "personal", cashReserve: 0, currency: "THB" };
const business: Account = { id: "acc_b", name: "Biz", type: "business", cashReserve: 0, currency: "THB" };

const hardware: Asset[] = [
	// Cash: 10000 opening, plus 3000 salary-like income, less the loan and card payments below.
	{ id: "w_main", entityId: "acc_p", name: "Main", cost: 10000, lifespanMonths: 0, purchaseDate: YM, category: "cash", kind: "cash", isDefault: true },
	// Laptop bought 2026-08 for 1200, 12-month life: 2 months elapsed -> 1000 book value.
	{ id: "laptop", entityId: "acc_p", name: "Laptop", cost: 1200, lifespanMonths: 12, purchaseDate: "2026-08", category: "laptop", kind: "fixed" },
	// ETF worth 5000 at 2026-10 with no return.
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
	{ id: "w_biz", entityId: "acc_b", name: "Biz main", cost: 2000, lifespanMonths: 0, purchaseDate: YM, category: "cash", kind: "cash", isDefault: true },
];

const revenues: Income[] = [
	{ id: "rev_fee", entityId: "acc_p", name: "Fee", amount: 3000, frequency: "monthly", source: "stripe", active: true, startMonth: YM, depositAssetId: "w_main" },
];

const liabilities: Liability[] = [
	// 12000 car loan, 0%, 6 months of 2000; October pays 2000 leaving 10000.
	{
		id: "loan_car",
		entityId: "acc_p",
		name: "Car",
		amount: 2000,
		category: "car_loan",
		kind: "loan",
		active: true,
		cycle: "monthly",
		startMonth: YM,
		loan: { principal: 12000, annualRate: 0, termMonths: 6, originatedOn: "2026-10-01" },
	},
	// Card balance 500 as of October, 50 minimum payment, no interest: closes at 450.
	{
		id: "card_1",
		entityId: "acc_p",
		name: "Card",
		amount: 50,
		category: "credit_card",
		kind: "revolving",
		active: true,
		cycle: "monthly",
		startMonth: YM,
		revolving: { balance: 500, balanceAsOf: YM, annualRate: 0 },
	},
];

describe("calculateEntityBalanceSheet", () => {
	it("cash + book value + investments - debt = net worth", () => {
		// Cash: 10000 + 3000 - 2000 (loan) - 50 (card) = 10950
		// Fixed: 1000 (laptop). Investments: 5000.
		// Assets: 16950. Debt: 10000 (loan) + 450 (card) = 10450. Net worth: 6500.
		const sheet = calculateEntityBalanceSheet({
			account: personal,
			hardware,
			subscriptions: [],
			revenues,
			liabilities,
			transfers: [],
			yearMonth: YM,
		});
		expect(sheet).toEqual({
			cash: 10950,
			fixedAssets: 1000,
			investments: 5000,
			totalAssets: 16950,
			debt: 10450,
			netWorth: 6500,
		});
		expect(sheet.cash + sheet.fixedAssets + sheet.investments - sheet.debt).toBe(sheet.netWorth);
	});
});

describe("calculateConsolidatedBalanceSheet", () => {
	it("sums the entity sheets", () => {
		// Personal as above (netWorth 6500). Business: cash 2000, nothing else.
		const consolidated = calculateConsolidatedBalanceSheet({
			accounts: [personal, business],
			hardware,
			subscriptions: [],
			revenues,
			liabilities,
			transfers: [],
			yearMonth: YM,
		});
		expect(consolidated).toEqual({
			cash: 12950,
			fixedAssets: 1000,
			investments: 5000,
			totalAssets: 18950,
			debt: 10450,
			netWorth: 8500,
		});

		const biz = calculateEntityBalanceSheet({
			account: business,
			hardware,
			subscriptions: [],
			revenues,
			liabilities,
			transfers: [],
			yearMonth: YM,
		});
		expect(biz.netWorth).toBe(2000);
		expect(consolidated.netWorth).toBe(6500 + biz.netWorth);
	});
});
