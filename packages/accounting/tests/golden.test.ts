import { describe, expect, it } from "vitest";
import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateCurrentTreasury,
	calculateMonthlyEquivalent,
	calculateWalletBalance,
	generateMonthlyLedger,
	hardwareToWallet,
	round2,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
	simulateCapitalTransfer,
	type HardwareAsset,
	walletToHardware,
} from "../src";

describe("@excited-live/accounting - Pure Solopreneur Math Engine", () => {
	it("reproduces exact baseline recurring subscriptions: ฿2,577.50/mo", () => {
		const totalMonthly = SEED_SUBSCRIPTIONS.reduce((acc, sub) => {
			return acc + calculateMonthlyEquivalent(sub.amount, sub.cycle);
		}, 0);

		expect(round2(totalMonthly)).toBe(2577.5);
	});

	it("reproduces exact baseline hardware depreciation in Oct 2026: ฿537.23/mo", () => {
		const totalDepOct = SEED_HARDWARE.reduce((acc, hw) => {
			const dep = calculateAssetDepreciation(hw, "2026-10");
			return acc + dep.monthlyRate;
		}, 0);

		// iPad: 181.67, SoundCore Space 1: 77.78, Open-Ear: 27.78, Amazfit: 83.33, Nothing: 166.67, PC: 0
		// Sum = 537.23
		expect(round2(totalDepOct)).toBe(537.23);
	});

	it("reproduces combined October 2026 headline burn: ฿3,114.73/mo", () => {
		const totalRecurring = SEED_SUBSCRIPTIONS.reduce(
			(acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle),
			0,
		);
		const totalDep = SEED_HARDWARE.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").monthlyRate,
			0,
		);

		const headline = round2(totalRecurring + totalDep);
		expect(headline).toBe(3114.73);
	});

	it("reproduces November 2026 iPad drop-off to ฿2,933.06/mo", () => {
		const ipadOct = calculateAssetDepreciation(
			SEED_HARDWARE.find((h) => h.id === "hw_ipad")!,
			"2026-10",
		);
		expect(ipadOct.isFullyDepreciated).toBe(false);
		expect(ipadOct.monthlyRate).toBe(181.67);

		const ipadNov = calculateAssetDepreciation(
			SEED_HARDWARE.find((h) => h.id === "hw_ipad")!,
			"2026-11",
		);
		expect(ipadNov.isFullyDepreciated).toBe(true);
		expect(ipadNov.monthlyRate).toBe(0);

		const totalDepNov = SEED_HARDWARE.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-11").monthlyRate,
			0,
		);
		expect(round2(totalDepNov)).toBe(355.56);

		const totalRecurring = SEED_SUBSCRIPTIONS.reduce(
			(acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle),
			0,
		);
		const headlineNov = round2(totalRecurring + totalDepNov);
		expect(headlineNov).toBe(2933.06);
	});

	it("simulates capital transfer from Personal to Business accurately", () => {
		const personalCash = 125000;
		const personalBurn = 3114.73;
		const bizCash = 45000;
		const bizNetBurn = 2472.5;

		const result = simulateCapitalTransfer(
			personalCash,
			personalBurn,
			bizCash,
			bizNetBurn,
			20000,
		);

		expect(result.fromNewCash).toBe(105000);
		expect(result.toNewCash).toBe(65000);
		// 105,000 / 3114.73 = 33.71 mos
		expect(result.fromNewRunway).toBe(33.71);
		// 65,000 / 2472.5 = 26.29 mos
		expect(result.toNewRunway).toBe(26.29);
	});

	it("generates a detailed monthly situation and ledger for FromSukong", () => {
		const bizAccount = SEED_ACCOUNTS.find((a) => a.id === "acc_fromsukong")!;
		const ledger = generateMonthlyLedger({
			account: bizAccount,
			yearMonth: "2026-10",
			subscriptions: SEED_SUBSCRIPTIONS,
			hardware: SEED_HARDWARE,
			revenues: SEED_REVENUES,
			transfers: SEED_TRANSFERS,
		});

		expect(ledger.summary.totalInflow).toBe(25000); // 20k seed transfer + 5k retainer
		expect(ledger.summary.totalCashOutflow).toBe(447.5); // Opencode 360 + Make 57.5 + Domain 30
		expect(ledger.summary.totalDepreciation).toBe(166.67); // Nothing phone 2a
		expect(ledger.actions.length).toBeGreaterThan(0);
	});

	it("correctly stops career salary inflow after endMonth has passed", () => {
		const personalAccount = {
			...SEED_ACCOUNTS.find((a) => a.id === "acc_personal")!,
			salary: 75000,
		};
		const careerRevenues = [
			{
				id: "rev_career_prame",
				entityId: personalAccount.id,
				name: "Engineering Lead",
				amount: 75000,
				frequency: "monthly" as const,
				source: "salary" as const,
				active: true,
				startMonth: "2026-01",
				endMonth: "2026-06",
			},
		];

		const ledgerBeforeEnd = generateMonthlyLedger({
			account: personalAccount,
			yearMonth: "2026-06",
			subscriptions: [],
			hardware: [],
			revenues: careerRevenues,
			transfers: [],
		});
		expect(ledgerBeforeEnd.summary.totalInflow).toBe(75000);

		const ledgerAfterEnd = generateMonthlyLedger({
			account: personalAccount,
			yearMonth: "2026-07",
			subscriptions: [],
			hardware: [],
			revenues: careerRevenues,
			transfers: [],
		});
		expect(ledgerAfterEnd.summary.totalInflow).toBe(0);
		expect(ledgerAfterEnd.actions.filter((a) => a.category === "salary")).toHaveLength(0);
	});

	it("adds net operating cash (income - expense) to default wallet and deducts when negative", () => {
		const defaultWallet: HardwareAsset = {
			id: "hw_default_biz",
			entityId: "acc_test_biz",
			name: "Main Operating Wallet",
			cost: 10000,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "cash",
			isDefault: true,
		};
		const secondaryWallet: HardwareAsset = {
			id: "hw_reserve_biz",
			entityId: "acc_test_biz",
			name: "Tax Reserve Account",
			cost: 5000,
			lifespanMonths: 0,
			purchaseDate: "2026-10",
			category: "cash",
			isDefault: false,
		};
		const hardware = [defaultWallet, secondaryWallet];

		// Scenario A: Positive cashflow (Income: 25k, Expense: 5k -> Net: +20k)
		const revs = [
			{
				id: "rev_1",
				entityId: "acc_test_biz",
				name: "Client Contract",
				amount: 25000,
				frequency: "monthly" as const,
				source: "bank_transfer" as const,
				active: true,
			},
		];
		const subs = [
			{
				id: "sub_1",
				entityId: "acc_test_biz",
				name: "Cloud Hosting",
				amount: 5000,
				cycle: "monthly" as const,
				category: "infrastructure",
				nextRenewalDate: "2026-10-15",
				active: true,
			},
		];

		const balDefaultSurplus = calculateCashAssetBalance({
			asset: defaultWallet,
			hardware,
			transfers: [],
			subscriptions: subs,
			revenues: revs,
			yearMonth: "2026-10",
		});

		// 10,000 base + 20,000 net = 30,000
		expect(balDefaultSurplus.isDefault).toBe(true);
		expect(balDefaultSurplus.netOperatingCash).toBe(20000);
		expect(balDefaultSurplus.effectiveBalance).toBe(30000);

		// Secondary wallet remains unaffected by operational cashflow
		const balReserve = calculateCashAssetBalance({
			asset: secondaryWallet,
			hardware,
			transfers: [],
			subscriptions: subs,
			revenues: revs,
			yearMonth: "2026-10",
		});
		expect(balReserve.isDefault).toBe(false);
		expect(balReserve.netOperatingCash).toBe(0);
		expect(balReserve.effectiveBalance).toBe(5000);

		// Scenario B: Deficit cashflow (Income: 2k, Expense: 7k -> Net: -5k)
		const subsDeficit = [
			{
				id: "sub_2",
				entityId: "acc_test_biz",
				name: "Heavy Compute",
				amount: 7000,
				cycle: "monthly" as const,
				category: "infrastructure",
				nextRenewalDate: "2026-10-15",
				active: true,
			},
		];
		const revsDeficit = [
			{
				id: "rev_2",
				entityId: "acc_test_biz",
				name: "Small gig",
				amount: 2000,
				frequency: "monthly" as const,
				source: "bank_transfer" as const,
				active: true,
			},
		];

		const balDefaultDeficit = calculateCashAssetBalance({
			asset: defaultWallet,
			hardware,
			transfers: [],
			subscriptions: subsDeficit,
			revenues: revsDeficit,
			yearMonth: "2026-10",
		});

		// 10,000 base - 5,000 deficit = 5,000
		expect(balDefaultDeficit.netOperatingCash).toBe(-5000);
		expect(balDefaultDeficit.effectiveBalance).toBe(5000);

		// calculateCurrentTreasury sums effective balances
		const treasury = calculateCurrentTreasury({
			account: {
				id: "acc_test_biz",
				name: "Test Biz",
				type: "business",
				cashReserve: 0,
				currency: "THB",
			},
			hardware,
			transfers: [],
			subscriptions: subsDeficit,
			revenues: revsDeficit,
			yearMonth: "2026-10",
		});
		// 5,000 (default) + 5,000 (reserve) = 10,000
		expect(treasury).toBe(10000);
	});

	it("dynamically changes startingTreasury, endingTreasury, and runway as months advance", () => {
		const testAccount = {
			id: "acc_advance_test",
			name: "Advance Test",
			type: "business" as const,
			cashReserve: 100000,
			currency: "THB" as const,
		};
		const hardware = [
			{
				id: "hw_cash_adv",
				entityId: "acc_advance_test",
				name: "Main Cash",
				cost: 100000,
				lifespanMonths: 0,
				purchaseDate: "2026-10",
				category: "cash" as const,
				isDefault: true,
			},
		];
		const subs = [
			{
				id: "sub_burn",
				entityId: "acc_advance_test",
				name: "Server Infra",
				amount: 10000,
				cycle: "monthly" as const,
				category: "infrastructure" as const,
				nextRenewalDate: "2026-10-15",
				active: true,
			},
		];

		const octLedger = generateMonthlyLedger({
			account: testAccount,
			yearMonth: "2026-10",
			subscriptions: subs,
			hardware,
			revenues: [],
			transfers: [],
		});
		expect(octLedger.summary.startingTreasury).toBe(100000);
		expect(octLedger.summary.endingTreasury).toBe(90000);
		expect(octLedger.summary.runwayMonths).toBe(10);

		const novLedger = generateMonthlyLedger({
			account: testAccount,
			yearMonth: "2026-11",
			subscriptions: subs,
			hardware,
			revenues: [],
			transfers: [],
		});
		expect(novLedger.summary.startingTreasury).toBe(90000);
		expect(novLedger.summary.endingTreasury).toBe(80000);
		expect(novLedger.summary.runwayMonths).toBe(9);

		const decLedger = generateMonthlyLedger({
			account: testAccount,
			yearMonth: "2026-12",
			subscriptions: subs,
			hardware,
			revenues: [],
			transfers: [],
		});
		expect(decLedger.summary.startingTreasury).toBe(80000);
		expect(decLedger.summary.endingTreasury).toBe(70000);
		expect(decLedger.summary.runwayMonths).toBe(8);

		// Also verify cash asset balance compounds across months
		const decCash = calculateCashAssetBalance({
			asset: hardware[0]!,
			hardware,
			transfers: [],
			subscriptions: subs,
			revenues: [],
			yearMonth: "2026-12",
		});
		// 100k - (10k * 3 months) = 70k
		expect(decCash.effectiveBalance).toBe(70000);
	});

	it("separates Stock (money in hand today) from Flow (month-end forecast) via calculateWalletBalance", () => {
		const wallet = {
			id: "wallet_kbank",
			entityId: "acc_test",
			name: "KBank Savings",
			balance: 10000,
			isDefault: true,
		};

		const subs = [
			{
				id: "sub_1",
				entityId: "acc_test",
				name: "Office Rent",
				amount: 10000,
				cycle: "monthly" as const,
				category: "facilities",
				nextRenewalDate: "2026-10-01",
				active: true,
			},
		];

		const revs = [
			{
				id: "rev_salary",
				entityId: "acc_test",
				name: "Salary",
				amount: 75000,
				frequency: "monthly" as const,
				source: "salary" as const,
				active: true,
			},
		];

		// User updates KBank Savings to ฿10,000.
		// Their actual cash in hand TODAY is ฿10,000 (Stock).
		// Their net operating cash this month is +฿65,000 (Flow).
		// Their projected EOM balance is ฿75,000 (Forecast).
		const breakdown = calculateWalletBalance({
			wallet,
			wallets: [wallet],
			transfers: [],
			subscriptions: subs,
			revenues: revs,
			yearMonth: "2026-10",
		});

		expect(breakdown.openingBalance).toBe(10000);
		expect(breakdown.currentCashOnHand).toBe(10000);
		expect(breakdown.netOperatingCash).toBe(65000);
		expect(breakdown.projectedEomBalance).toBe(75000);
		expect(breakdown.isDefault).toBe(true);

		// Verify bidirectional converter helpers
		const hwAdapted = walletToHardware(wallet);
		expect(hwAdapted.category).toBe("cash");
		expect(hwAdapted.cost).toBe(10000);

		const walletRestored = hardwareToWallet(hwAdapted);
		expect(walletRestored.id).toBe(wallet.id);
		expect(walletRestored.balance).toBe(10000);
	});
});
