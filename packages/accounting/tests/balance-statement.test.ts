import { describe, expect, it } from "vitest";
import {
	calculateAvailableCash,
	calculateEntityCashOnHand,
	calculateEntityWealthMetrics,
	calculateTreasuryAsOf,
	generateMonthlyLedger,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "../src";

/**
 * A wallet balance is a dated statement, not income. Prame's real case: an
 * empty book, one cash wallet stating ฿74,970.63 on 26 Oct 2026, no flows.
 * The stock must not exist before that day, must land as exactly one dated
 * balance_statement entry, and must never be reported as inflow.
 */

const personal: EntityAccount = {
	id: "acc_p",
	name: "Personal",
	type: "personal",
	cashReserve: 0,
	currency: "THB",
};

const PRAME_BALANCE = 74970.63;

const statedWallet: HardwareAsset = {
	id: "hw_main",
	entityId: "acc_p",
	name: "Personal Main Wallet",
	cost: PRAME_BALANCE,
	lifespanMonths: 0,
	purchaseDate: "2026-10-26",
	category: "cash",
	kind: "cash",
	isDefault: true,
};

const base = {
	account: personal,
	revenues: [] as RevenueStream[],
	subscriptions: [] as RecurringSubscription[],
	transfers: [] as CapitalTransfer[],
	liabilities: [] as LiabilityStream[],
	hardware: [statedWallet],
};

describe("a date-anchored wallet balance is one dated balance statement", () => {
	it("is 0 everywhere before the anchor day", () => {
		const sep = generateMonthlyLedger({ ...base, yearMonth: "2026-09" });
		expect(sep.summary.startingTreasury).toBe(0);
		expect(sep.summary.endingTreasury).toBe(0);
		expect(sep.summary.totalInflow).toBe(0);
		expect(sep.summary.totalAdjustments).toBe(0);
		expect(sep.actions).toEqual([]);

		expect(calculateTreasuryAsOf({ ...base, asOfDate: "2026-09-15" })).toBe(0);
		expect(calculateTreasuryAsOf({ ...base, asOfDate: "2026-10-20" })).toBe(0);
		expect(calculateEntityCashOnHand({ ...base, yearMonth: "2026-09" })).toBe(0);
		expect(calculateAvailableCash({ ...base, asOfDate: "2026-10-20" })).toBe(0);

		// currentLiquid on a date before the anchor is 0 too.
		const september = calculateEntityWealthMetrics({ ...base, yearMonth: "2026-09", asOfDate: "2026-09-15" });
		expect(september.currentLiquid).toBe(0);
	});

	it("opens October at 0 and closes at the statement, as one 26 Oct entry", () => {
		const oct = generateMonthlyLedger({ ...base, yearMonth: "2026-10" });
		expect(oct.summary.startingTreasury).toBe(0);
		expect(oct.summary.totalInflow).toBe(0);
		expect(oct.summary.totalCashOutflow).toBe(0);
		expect(oct.summary.totalAdjustments).toBe(PRAME_BALANCE);
		expect(oct.summary.netCashFlow).toBe(0);
		expect(oct.summary.netChange).toBe(PRAME_BALANCE);
		expect(oct.summary.endingTreasury).toBe(PRAME_BALANCE);

		const statements = oct.actions.filter((action) => action.flowType === "balance_statement");
		expect(statements).toHaveLength(1);
		expect(statements[0]).toMatchObject({
			date: "2026-10-26",
			amount: PRAME_BALANCE,
			category: "balance_statement",
			sourceType: "asset",
			direction: "inflow",
			cashAssetId: statedWallet.id,
		});
		expect(oct.actions).toHaveLength(1);

		expect(calculateTreasuryAsOf({ ...base, asOfDate: "2026-10-26" })).toBe(PRAME_BALANCE);
		expect(calculateAvailableCash({ ...base, asOfDate: "2026-10-26" })).toBe(PRAME_BALANCE);
		expect(calculateEntityCashOnHand({ ...base, yearMonth: "2026-10" })).toBe(PRAME_BALANCE);

		const october = calculateEntityWealthMetrics({ ...base, yearMonth: "2026-10", asOfDate: "2026-10-26" });
		expect(october.currentLiquid).toBe(PRAME_BALANCE);
		expect(october.totalIncome).toBe(0);
		expect(october.totalAdjustments).toBe(PRAME_BALANCE);
	});

	it("is not re-applied in later months", () => {
		const nov = generateMonthlyLedger({ ...base, yearMonth: "2026-11" });
		expect(nov.summary.startingTreasury).toBe(PRAME_BALANCE);
		expect(nov.summary.totalAdjustments).toBe(0);
		expect(nov.summary.endingTreasury).toBe(PRAME_BALANCE);
		expect(nov.actions.filter((action) => action.flowType === "balance_statement")).toEqual([]);
	});

	it("never double-counts income or spending around the statement", () => {
		const salary: RevenueStream = {
			id: "rev_salary",
			entityId: "acc_p",
			name: "Salary",
			amount: 50000,
			frequency: "monthly",
			source: "salary",
			active: true,
			startMonth: "2026-10",
			dayOfMonth: 28,
		};
		const rent: RecurringSubscription = {
			id: "sub_rent",
			entityId: "acc_p",
			name: "Rent",
			amount: 30000,
			cycle: "monthly",
			category: "housing",
			nextRenewalDate: "2026-10-05",
			active: true,
			startMonth: "2026-10",
		};
		const oct = generateMonthlyLedger({ ...base, yearMonth: "2026-10", revenues: [salary], subscriptions: [rent] });
		// Rent is inside the 26 Oct statement; salary lands after it.
		expect(oct.summary.startingTreasury).toBe(0);
		expect(oct.summary.totalInflow).toBe(50000);
		expect(oct.summary.totalCashOutflow).toBe(0);
		expect(oct.summary.totalAdjustments).toBe(PRAME_BALANCE);
		expect(oct.summary.endingTreasury).toBe(124970.63);
		expect(oct.actions.map((action) => action.flowType)).toEqual(["balance_statement", "income"]);
		expect(oct.summary.netChange).toBe(oct.summary.netCashFlow + oct.summary.totalAdjustments);
	});

	it("keeps a month-only balance on the opening-balance convention", () => {
		const monthOnly: HardwareAsset = { ...statedWallet, id: "hw_oct", cost: 10000, purchaseDate: "2026-10" };
		const params = { ...base, hardware: [monthOnly] };
		expect(generateMonthlyLedger({ ...params, yearMonth: "2026-10" }).summary.startingTreasury).toBe(10000);
		expect(generateMonthlyLedger({ ...params, yearMonth: "2026-10" }).summary.totalAdjustments).toBe(0);
		expect(generateMonthlyLedger({ ...params, yearMonth: "2026-10" }).summary.endingTreasury).toBe(10000);
	});
});
