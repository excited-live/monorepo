import { describe, expect, it } from "vitest";
import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	generateMonthlyLedger,
	round2,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
	simulateCapitalTransfer,
} from "../src";

describe("@excited-live/biz - Pure Solopreneur Math Engine", () => {
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
});
