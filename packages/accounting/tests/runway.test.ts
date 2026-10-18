import { describe, expect, it } from "vitest";
import {
	calculateAvailableCash,
	calculateCashAssetBalance,
	calculateEntityWealthMetrics,
	calculateProjectionBalances,
	calculateRunwayProjection,
	generateMonthlyLedger,
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

	it("reports 0 months for an already-overdrawn entity even without burn", () => {
		const params = { ...base, subscriptions: [{ ...rent, amount: 50000 }], transfers: [] };
		expect(
			calculateRunwayProjection({ account: personal, yearMonth: "2026-10", ...params, openingTreasury: -20000 }),
		).toEqual({ runwayMonths: 0, isDefaultAlive: false });
	});

	it("never counts income that has not landed yet as available cash", () => {
		// Oct: opens 300k, ends 320k → 300k available
		expect(calculateAvailableCash({ account: personal, yearMonth: "2026-10", ...base })).toBe(300000);
		// Dec: opens 300k, ends 240k (laptop) → 240k available
		expect(calculateAvailableCash({ account: personal, yearMonth: "2026-12", ...base })).toBe(240000);
	});
});
