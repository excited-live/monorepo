import { describe, expect, it } from "vitest";
import {
	calculateAvailableCash,
	calculateCashAssetBalance,
	calculateEntityWealthMetrics,
	calculateProjectionBalances,
	calculateRunwayProjection,
	calculateTreasuryAsOf,
	generateMonthlyLedger,
	normalizeSnapshot,
	type AccountingSnapshot,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type RecurringSubscription,
	type RevenueStream,
} from "../src";

const personal: EntityAccount = {
	id: "acc_p",
	name: "Personal",
	type: "personal",
	cashReserve: 0, // never maintained by the app: cash lives in the wallets
	currency: "THB",
};
const business: EntityAccount = {
	id: "acc_b",
	name: "Biz",
	type: "business",
	cashReserve: 0,
	currency: "THB",
};

const wallet: HardwareAsset = {
	id: "hw_wallet",
	entityId: "acc_p",
	name: "Bank",
	cost: 300000,
	lifespanMonths: 0,
	purchaseDate: "2026-10",
	category: "cash",
	isDefault: true,
};

const salary = (endMonth?: string): RevenueStream => ({
	id: "rev_salary",
	entityId: "acc_p",
	name: "Salary",
	amount: 50000,
	frequency: "monthly",
	source: "salary",
	active: true,
	startMonth: "2026-10",
	...(endMonth ? { endMonth } : {}),
});

const rent: RecurringSubscription = {
	id: "sub_rent",
	entityId: "acc_p",
	name: "Rent",
	amount: 30000,
	cycle: "monthly",
	category: "housing",
	nextRenewalDate: "2026-10-05",
	active: true,
};

const laptop: RecurringSubscription = {
	id: "sub_laptop",
	entityId: "acc_p",
	name: "Laptop",
	amount: 80000,
	cycle: "one_time",
	category: "gear",
	nextRenewalDate: "2026-12-05",
	active: true,
};

const seedTransfer: CapitalTransfer = {
	id: "tx_seed",
	fromEntityId: "acc_p",
	toEntityId: "acc_b",
	amount: 40000,
	date: "2026-11-10",
	note: "Seed",
	frequency: "one_time",
};

const base = {
	hardware: [wallet],
	subscriptions: [rent, laptop],
	revenues: [salary()],
	transfers: [seedTransfer],
	liabilities: [],
};

describe("cashflow projection & runway", () => {
	it("anchors the projection's Now on the opening treasury, not account.cashReserve", () => {
		const projection = calculateProjectionBalances({ account: personal, yearMonth: "2026-10", ...base });
		expect(projection.balances.get(0)).toBe(300000);
		expect(projection.balances.get(1)).toBe(320000); // + Oct net (50k − 30k)
		expect(projection.balances.get(2)).toBe(300000); // + Nov net (50k − 30k − 40k transfer)
		expect(projection.balances.get(3)).toBe(240000); // + Dec net (50k − 30k − 80k laptop)
		expect(projection.balances.get(-1)).toBe(330000); // − Sep net (rent only: salary starts in Oct)
	});

	it("counts a dated transfer once, in its own month", () => {
		const expected: Record<string, [number, number]> = {
			"2026-10": [300000, 320000],
			"2026-11": [320000, 300000],
			"2026-12": [300000, 240000],
			"2027-01": [240000, 260000],
		};
		for (const [ym, [start, end]] of Object.entries(expected)) {
			const { summary } = generateMonthlyLedger({ account: personal, yearMonth: ym, ...base });
			expect(summary.startingTreasury, ym).toBe(start);
			expect(summary.endingTreasury, ym).toBe(end);
			// Wallet balance and ledger agree on end-of-month cash
			const walletEom = calculateCashAssetBalance({ asset: wallet, account: personal, yearMonth: ym, ...base });
			expect(walletEom.effectiveBalance, ym).toBe(end);
		}

		// Receiving entity without a wallet still accumulates the transfer
		const biz = generateMonthlyLedger({ account: business, yearMonth: "2026-12", ...base });
		expect(biz.summary.startingTreasury).toBe(40000);
	});

	it("does not flip Default Alive on months with one-off items", () => {
		for (const ym of ["2026-10", "2026-11", "2026-12", "2027-01"]) {
			const m = calculateEntityWealthMetrics({ account: personal, yearMonth: ym, ...base });
			expect(m.isDefaultAlive, ym).toBe(true);
			expect(m.runwayMonths, ym).toBeNull();
		}
	});

	it("counts months until cash runs out when income ends", () => {
		const params = { ...base, revenues: [salary("2026-12")], subscriptions: [rent], transfers: [] };
		// Oct–Dec: +20k/mo → 360k at the start of Jan, then −30k/mo for 12 months
		expect(calculateRunwayProjection({ account: personal, yearMonth: "2026-10", ...params })).toEqual({
			runwayMonths: 15,
			isDefaultAlive: false,
		});
		expect(calculateRunwayProjection({ account: personal, yearMonth: "2027-01", ...params }).runwayMonths).toBe(12);
		// Interpolates inside the month the balance crosses zero: 345k / 30k
		expect(
			calculateRunwayProjection({ account: personal, yearMonth: "2027-01", ...params, openingTreasury: 345000 })
				.runwayMonths,
		).toBe(11.5);
	});

	it("treats a monthly transfer as recurring burn from its start month", () => {
		const monthly: CapitalTransfer = { ...seedTransfer, id: "tx_monthly", amount: 25000, date: "2026-10-01", frequency: "monthly" };
		const params = { ...base, subscriptions: [rent], transfers: [monthly] };
		const oct = generateMonthlyLedger({ account: personal, yearMonth: "2026-10", ...params });
		expect(oct.summary.startingTreasury).toBe(300000);
		// Net −5k/mo → 300k lasts 60 months
		expect(oct.summary.runwayMonths).toBe(60);
		expect(oct.summary.status).toBe("DEFAULT DEAD");
	});

	it("does not call an empty account Default Alive", () => {
		const result = calculateRunwayProjection({ account: business, yearMonth: "2026-10", hardware: [], transfers: [] });
		expect(result).toEqual({ runwayMonths: null, isDefaultAlive: false });
	});

	it("extrapolates a burn that outlasts the horizon instead of calling it Default Alive", () => {
		const params = { ...base, revenues: [salary()], subscriptions: [{ ...rent, amount: 60000 }], transfers: [] };
		// 2M at −10k/mo = 200 months, beyond the 120-month horizon
		expect(
			calculateRunwayProjection({ account: personal, yearMonth: "2026-10", ...params, openingTreasury: 2000000 }),
		).toEqual({ runwayMonths: 200, isDefaultAlive: false });
	});

	it("reports 0 months for an overdrawn entity that stays below zero", () => {
		const params = { ...base, subscriptions: [{ ...rent, amount: 50000 }], transfers: [] };
		expect(
			calculateRunwayProjection({ account: personal, yearMonth: "2026-10", ...params, openingTreasury: -20000 }),
		).toEqual({ runwayMonths: 0, isDefaultAlive: false });
	});

	it("never counts income that has not landed yet as available cash", () => {
		const paid: EntityAccount = { ...personal, paydayDayOfMonth: 25 };
		const params = { ...base, subscriptions: [rent, { ...laptop, nextRenewalDate: "2026-10-20" }], transfers: [] };
		// Oct 18: 300k − rent 30k (5th) = 270k now, then laptop 80k on the 20th before
		// salary on the 25th → only 190k can move without dipping below zero
		expect(calculateAvailableCash({ account: paid, asOfDate: "2026-10-18", ...params })).toBe(190000);
		// After payday nothing is pending: available = today's balance
		expect(calculateAvailableCash({ account: paid, asOfDate: "2026-10-26", ...params })).toBe(240000);
	});

	it("treats a balance typed mid-month as a dated statement, not double-counted", () => {
		const paid: EntityAccount = { ...personal, paydayDayOfMonth: 25 };
		// Bank shows 50k on Oct 18, after rent (5th); salary still to come on the 25th
		const typed: HardwareAsset = { ...wallet, cost: 50000, purchaseDate: "2026-10-18" };
		const params = { ...base, hardware: [typed], subscriptions: [rent], transfers: [] };
		expect(calculateTreasuryAsOf({ account: paid, asOfDate: "2026-10-17", ...params })).toBe(0);
		expect(calculateTreasuryAsOf({ account: paid, asOfDate: "2026-10-18", ...params })).toBe(50000);
		const oct = generateMonthlyLedger({ account: paid, yearMonth: "2026-10", ...params });
		// The statement is the only October cash movement before the 18th: the
		// rent on the 5th already sits inside the 50k balance and is not deducted
		// a second time.
		expect(oct.summary.startingTreasury).toBe(0);
		expect(oct.summary.totalInflow).toBe(50000); // salary on the 25th
		expect(oct.summary.totalCashOutflow).toBe(0);
		expect(oct.summary.totalAdjustments).toBe(50000);
		expect(oct.summary.netChange).toBe(100000);
		expect(oct.summary.endingTreasury).toBe(100000); // 50k statement + salary
		expect(oct.actions.filter((action) => action.flowType === "balance_statement")).toEqual([
			expect.objectContaining({ date: "2026-10-18", amount: 50000, category: "balance_statement" }),
		]);
		expect(oct.actions.some((action) => action.id === rent.id)).toBe(false);
	});

	it("does not call a dip that recovers within the month overdrawn", () => {
		const params = { ...base, subscriptions: [rent], transfers: [] };
		expect(
			calculateRunwayProjection({ account: personal, yearMonth: "2026-10", ...params, openingTreasury: -1000 }),
		).toEqual({ runwayMonths: null, isDefaultAlive: true });
	});

	it("clamps paydays past the month's last day", () => {
		const paid: EntityAccount = { ...personal, paydayDayOfMonth: 31 };
		const { actions } = generateMonthlyLedger({ account: paid, yearMonth: "2027-02", ...base });
		expect(actions.find((a) => a.id === "rev_salary")?.date).toBe("2027-02-28");
	});

	it("only charges expenses and liabilities inside their start/end months", () => {
		const gym: RecurringSubscription = { ...rent, id: "sub_gym", amount: 2000, startMonth: "2026-11", endMonth: "2026-12" };
		const loan = { id: "l_car", entityId: "acc_p", name: "Car", amount: 9000, category: "car_loan", active: true, startMonth: "2026-12" };
		const params = { ...base, subscriptions: [gym], revenues: [], transfers: [], liabilities: [loan] };
		const outOf = (ym: string) => generateMonthlyLedger({ account: personal, yearMonth: ym, ...params }).summary.totalCashOutflow;
		expect(outOf("2026-10")).toBe(0);
		expect(outOf("2026-11")).toBe(2000);
		expect(outOf("2026-12")).toBe(11000);
		expect(outOf("2027-01")).toBe(9000); // gym ended, loan open-ended
	});

	it("computes NOW as of today: only movements dated on or before the day", () => {
		const personalPayday: EntityAccount = { ...personal, paydayDayOfMonth: 25 };
		const params = { ...base, subscriptions: [rent], transfers: [{ ...seedTransfer, date: "2026-10-10" }] };
		const asOf = (day: string) => calculateTreasuryAsOf({ account: personalPayday, asOfDate: day, ...params });
		expect(asOf("2026-10-01")).toBe(300000); // nothing moved yet
		expect(asOf("2026-10-05")).toBe(270000); // rent on the 5th
		expect(asOf("2026-10-18")).toBe(230000); // + transfer out on the 10th
		expect(asOf("2026-10-31")).toBe(280000); // + salary on payday (25th) = end of month
	});

	it("backfills start months and wallet as-of dates on old snapshots", () => {
		const snapshot: AccountingSnapshot = {
			accounts: [personal],
			hardware: [{ ...wallet, purchaseDate: "Historical" }, { ...wallet, id: "hw_old_gear", category: "laptop", lifespanMonths: 36, purchaseDate: "Historical" }],
			subscriptions: [{ ...rent }, { ...laptop }],
			revenues: [{ ...salary(), startMonth: undefined }, { ...salary(), id: "rev_dated", startMonth: "2025-01" }],
			transfers: [],
			liabilities: [{ id: "l1", entityId: "acc_p", name: "Loan", amount: 1, category: "other", active: true }],
			updatedAt: "2026-09-14T08:00:00.000Z",
		};
		const n = normalizeSnapshot(snapshot);
		expect(n.hardware[0]!.purchaseDate).toBe("2026-09"); // undated wallet → last saved month
		expect(n.hardware[1]!.purchaseDate).toBe("Historical"); // gear keeps its meaning
		expect(n.subscriptions[0]!.startMonth).toBe("2026-09"); // tracking start
		expect(n.subscriptions[1]!.startMonth).toBe("2026-12"); // one-time → its charge month
		expect(n.revenues[0]!.startMonth).toBe("2026-09");
		expect(n.revenues[1]!.startMonth).toBe("2025-01"); // already dated: untouched
		expect(n.liabilities![0]!.startMonth).toBe("2026-09");
		expect(n.subscriptions[0]!.endMonth).toBeUndefined(); // end stays open
		expect(normalizeSnapshot(n)).toEqual(n); // idempotent

		// An earlier transfer pulls the undated wallet's month back so it still counts
		const withTransfer = normalizeSnapshot({ ...snapshot, transfers: [{ ...seedTransfer, date: "2026-08-10" }] });
		expect(withTransfer.hardware[0]!.purchaseDate).toBe("2026-08");
	});
});
