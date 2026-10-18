import { describe, expect, it } from "vitest";
import {
	buildMonthlyActions,
	calculateCashAssetBalance,
	calculateCurrentTreasury,
	liabilityPaymentInMonth,
} from "../src/ledger";
import {
	buildLoanSchedule,
	buildRevolvingSchedule,
	calculateLiabilityBalance,
	calculateLoanBalance,
	calculateLoanPayment,
	calculateRevolvingBalance,
} from "../src/liabilities";
import type { Asset, CapitalTransfer, EntityAccount, Expense, Liability } from "../src/types";

const YM = "2026-10";

const personal: EntityAccount = { id: "acc_p", name: "Me", type: "personal", cashReserve: 0, currency: "THB" };

function cashWallet(overrides: Partial<Asset> & { id: string; cost: number }): Asset {
	return {
		entityId: "acc_p",
		name: overrides.id,
		lifespanMonths: 0,
		purchaseDate: "2026-10",
		category: "cash",
		kind: "cash",
		...overrides,
	} as Asset;
}

function loan(overrides: Partial<Liability> & { id: string; amount: number }): Liability {
	return {
		entityId: "acc_p",
		name: overrides.id,
		category: "car_loan",
		kind: "loan",
		active: true,
		cycle: "monthly",
		startMonth: "2026-10",
		...overrides,
	} as Liability;
}

function transfer(overrides: Partial<CapitalTransfer> & { id: string; amount: number }): CapitalTransfer {
	return {
		fromEntityId: "acc_p",
		toEntityId: "acc_p",
		date: "2026-10-05",
		note: "",
		...overrides,
	} as CapitalTransfer;
}

describe("calculateLoanPayment", () => {
	it("0% loan repays principal in equal parts", () => {
		// 9000 / 3 = 3000; 12000 / 12 = 1000
		expect(calculateLoanPayment(9000, 0, 3)).toBe(3000);
		expect(calculateLoanPayment(12000, 0, 12)).toBe(1000);
	});

	it("standard annuity: 100000 at 12%/yr over 12 months", () => {
		// r = 0.01; 1 / 1.01^12 = 0.8874489; payment = 1000 / (1 - 0.8874489) = 8884.88
		expect(calculateLoanPayment(100000, 0.12, 12)).toBe(8884.88);
	});
});

describe("0% installment loan", () => {
	// 3000 over 3 months at 1000 a month, starting 2026-10.
	const installment = loan({
		id: "loan_tv",
		amount: 1000,
		loan: { principal: 3000, annualRate: 0, termMonths: 3, originatedOn: "2026-10-01" },
	});

	it("schedule closes to 0 after three payments, then stops", () => {
		const schedule = buildLoanSchedule({ liability: installment, throughYearMonth: "2027-01" });
		expect(schedule.map((e) => [e.yearMonth, e.opening, e.payment, e.closing])).toEqual([
			["2026-10", 3000, 1000, 2000],
			["2026-11", 2000, 1000, 1000],
			["2026-12", 1000, 1000, 0],
			["2027-01", 0, 0, 0],
		]);
	});

	it("the ledger charges 1000 for each of the three months and nothing after", () => {
		expect(liabilityPaymentInMonth(installment, "2026-10", [])).toBe(1000);
		expect(liabilityPaymentInMonth(installment, "2026-12", [])).toBe(1000);
		expect(liabilityPaymentInMonth(installment, "2027-01", [])).toBe(0);

		const jan = buildMonthlyActions({
			account: personal,
			yearMonth: "2027-01",
			subscriptions: [],
			hardware: [],
			revenues: [],
			transfers: [],
			liabilities: [installment],
		});
		expect(jan.actions).toHaveLength(0);
		expect(jan.totalCashOutflow).toBe(0);

		const oct = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [],
			hardware: [],
			revenues: [],
			transfers: [],
			liabilities: [installment],
		});
		expect(oct.totalCashOutflow).toBe(1000);
		expect(oct.actions[0]?.split).toEqual({ interest: 0, principal: 1000 });
	});

	it("balance at the end of each month", () => {
		expect(calculateLoanBalance(installment, "2026-09")).toBe(0);
		expect(calculateLoanBalance(installment, YM)).toBe(2000);
		expect(calculateLoanBalance(installment, "2026-12")).toBe(0);
	});
});

describe("interest-bearing loan", () => {
	// 100000 at 12%/yr over 12 months; payment 8884.88 (see calculateLoanPayment).
	const mortgage = loan({
		id: "loan_house",
		amount: calculateLoanPayment(100000, 0.12, 12),
		category: "mortgage",
		loan: { principal: 100000, annualRate: 0.12, termMonths: 12, originatedOn: "2026-10-01" },
	});

	it("first month: interest 1000 (100000 * 1%), principal 7884.88, closing 92115.12", () => {
		const [first] = buildLoanSchedule({ liability: mortgage, throughYearMonth: YM });
		expect(first).toEqual({
			yearMonth: YM,
			opening: 100000,
			interest: 1000,
			payment: 8884.88,
			extra: 0,
			principal: 7884.88,
			closing: 92115.12,
		});
	});

	it("the ledger action carries the interest/principal split", () => {
		const oct = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [],
			hardware: [],
			revenues: [],
			transfers: [],
			liabilities: [mortgage],
		});
		expect(oct.totalCashOutflow).toBe(8884.88);
		expect(oct.actions[0]?.split).toEqual({ interest: 1000, principal: 7884.88 });
	});

	it("an extra payment into the loan lowers the next opening balance and ends the loan sooner", () => {
		// Extra 80000 in October: due 101000 - payment 8884.88 = 92115.12 so all 80000 applies.
		// closing Oct = 100000 + 1000 - 8884.88 - 80000 = 12115.12
		// Nov: interest 121.15, due 12236.27, payment 8884.88, closing 3351.39
		// Dec: interest 33.51, due 3384.90, payment 3384.90 (capped), closing 0
		// Jan: nothing left to pay.
		const extra = transfer({
			id: "tx_prepay",
			amount: 80000,
			date: "2026-10-20",
			fromAssetId: "w_main",
			toLiabilityId: "loan_house",
		});
		const schedule = buildLoanSchedule({ liability: mortgage, transfers: [extra], throughYearMonth: "2027-01" });
		expect(schedule.map((e) => [e.yearMonth, e.opening, e.payment, e.extra, e.closing])).toEqual([
			["2026-10", 100000, 8884.88, 80000, 12115.12],
			["2026-11", 12115.12, 8884.88, 0, 3351.39],
			["2026-12", 3351.39, 3384.9, 0, 0],
			["2027-01", 0, 0, 0, 0],
		]);

		const without = buildLoanSchedule({ liability: mortgage, throughYearMonth: YM });
		expect(without[0]?.closing).toBe(92115.12);
		expect(liabilityPaymentInMonth(mortgage, "2027-01", [extra])).toBe(0);
		expect(liabilityPaymentInMonth(mortgage, "2027-01", [])).toBe(8884.88);
	});
});

describe("loan proceeds", () => {
	// 20000 borrowed at 0% over 10 months (2000 a month), landing in w_sav in October.
	const hardware = [
		cashWallet({ id: "w_main", cost: 1000, isDefault: true }),
		cashWallet({ id: "w_sav", cost: 500 }),
	];
	const car = loan({
		id: "loan_car",
		amount: 2000,
		startMonth: "2026-11",
		loan: {
			principal: 20000,
			annualRate: 0,
			termMonths: 10,
			originatedOn: "2026-10-05",
			proceedsAssetId: "w_sav",
		},
	});

	it("the principal lands in the proceeds wallet in the origination month", () => {
		const sav = calculateCashAssetBalance({
			asset: hardware[1]!,
			hardware,
			transfers: [],
			account: personal,
			liabilities: [car],
			yearMonth: YM,
		});
		expect(sav.netOperatingCash).toBe(20000);
		expect(sav.effectiveBalance).toBe(20500);

		const main = calculateCashAssetBalance({
			asset: hardware[0]!,
			hardware,
			transfers: [],
			account: personal,
			liabilities: [car],
			yearMonth: YM,
		});
		expect(main.effectiveBalance).toBe(1000);
	});

	it("the entity treasury rises by the principal", () => {
		const args = { account: personal, hardware, transfers: [], liabilities: [], yearMonth: YM };
		const without = calculateCurrentTreasury(args);
		const withLoan = calculateCurrentTreasury({ ...args, liabilities: [car] });
		// 1500 without the loan; 1500 + 20000 with it.
		expect(without).toBe(1500);
		expect(withLoan - without).toBe(20000);
	});

	it("is an inflow action dated on originatedOn, not in the next month", () => {
		const oct = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [],
			hardware,
			revenues: [],
			transfers: [],
			liabilities: [car],
		});
		expect(oct.totalInflow).toBe(20000);
		expect(oct.actions).toEqual([
			expect.objectContaining({
				id: "loan_proceeds_loan_car",
				date: "2026-10-05",
				amount: 20000,
				direction: "inflow",
				category: "loan_proceeds",
				flowType: "loan_proceeds",
				sourceType: "liability",
				cashAssetId: "w_sav",
			}),
		]);

		const nov = buildMonthlyActions({
			account: personal,
			yearMonth: "2026-11",
			subscriptions: [],
			hardware,
			revenues: [],
			transfers: [],
			liabilities: [car],
		});
		expect(nov.totalInflow).toBe(0);
		expect(nov.totalCashOutflow).toBe(2000);
	});
});

describe("revolving credit (card)", () => {
	// Card balance 10000 at 18%/yr as of 2026-10; minimum payment 500 a month.
	// A 300 subscription is charged to the card each month.
	const card = loan({
		id: "card_1",
		amount: 500,
		category: "credit_card",
		kind: "revolving",
		revolving: { balance: 10000, balanceAsOf: YM, annualRate: 0.18 },
	});
	const aiTool: Expense = {
		id: "sub_ai",
		entityId: "acc_p",
		name: "AI tool",
		amount: 300,
		cycle: "monthly",
		category: "tools",
		nextRenewalDate: "2026-10-10",
		active: true,
		paidFromLiabilityId: "card_1",
	};
	const hardware = [cashWallet({ id: "w_main", cost: 5000, isDefault: true })];

	it("October: interest 150 on 10000, charge 300 raises it, payment 500 lowers it", () => {
		// closing = 10000 + 150 + 300 - 500 = 9950
		const [oct] = buildRevolvingSchedule({ liability: card, subscriptions: [aiTool], yearMonth: YM });
		expect(oct).toEqual({ yearMonth: YM, opening: 10000, interest: 150, charges: 300, payments: 500, closing: 9950 });
		expect(calculateRevolvingBalance({ liability: card, subscriptions: [aiTool], yearMonth: YM })).toBe(9950);
		expect(calculateLiabilityBalance(card, YM, { subscriptions: [aiTool] })).toBe(9950);
	});

	it("November: interest accrues on the new opening balance", () => {
		// interest = 9950 * 1.5% = 149.25; closing = 9950 + 149.25 + 300 - 500 = 9899.25
		expect(calculateRevolvingBalance({ liability: card, subscriptions: [aiTool], yearMonth: "2026-11" })).toBe(9899.25);
	});

	it("the card charge is not cash; the card payment is", () => {
		const oct = buildMonthlyActions({
			account: personal,
			yearMonth: YM,
			subscriptions: [aiTool],
			hardware,
			revenues: [],
			transfers: [],
			liabilities: [card],
		});
		expect(oct.actions.some((a) => a.id === "sub_ai")).toBe(false);
		expect(oct.totalCashOutflow).toBe(500);
		expect(oct.actions.find((a) => a.id === "card_1")?.amount).toBe(500);

		const cash = calculateCashAssetBalance({
			asset: hardware[0]!,
			hardware,
			transfers: [],
			account: personal,
			subscriptions: [aiTool],
			liabilities: [card],
			yearMonth: YM,
		});
		expect(cash.netOperatingCash).toBe(-500);
	});

	it("before balanceAsOf the recorded balance is returned", () => {
		expect(calculateRevolvingBalance({ liability: card, subscriptions: [aiTool], yearMonth: "2026-09" })).toBe(10000);
	});

	it("other kinds have no known balance", () => {
		const other = loan({ id: "other_1", amount: 100, kind: "other" });
		expect(calculateLiabilityBalance(other, YM)).toBeNull();
	});
});

describe("recurring extra payments into a loan", () => {
	it("stop taking cash once the loan is paid off", () => {
		// 0% loan of 3000 at 1000/month plus a monthly 1000 extra transfer:
		// Oct pays 1000 + 1000 extra (closing 1000), Nov pays 1000 + 0 extra (closing 0), Dec nothing.
		const car = loan({
			id: "loan_car",
			amount: 1000,
			loan: { principal: 3000, annualRate: 0, termMonths: 3, originatedOn: "2026-10" },
		});
		const extra = transfer({
			id: "tx_extra",
			amount: 1000,
			date: "2026-10-05",
			frequency: "monthly",
			toLiabilityId: "loan_car",
			fromAssetId: "cash_p",
		});
		const hardware = [cashWallet({ id: "cash_p", cost: 10000, isDefault: true })];
		const outflow = (yearMonth: string) =>
			buildMonthlyActions({
				account: personal,
				yearMonth,
				subscriptions: [],
				hardware,
				revenues: [],
				transfers: [extra],
				liabilities: [car],
			}).totalCashOutflow;

		expect(outflow("2026-10")).toBe(2000);
		expect(outflow("2026-11")).toBe(1000);
		expect(outflow("2026-12")).toBe(0);
		// 10000 − 2000 − 1000 = 7000, and it stays there
		expect(calculateCurrentTreasury({ account: personal, hardware, transfers: [extra], liabilities: [car], yearMonth: "2027-03" })).toBe(7000);
	});
});
