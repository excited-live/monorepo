import { describe, expect, it } from "vitest";
import {
	calculateConsolidatedWealthMetrics,
	calculateCurrentTreasury,
	calculateEntityWealthMetrics,
	calculatePaydayCountdown,
	calculateProjectionBalances,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_LIABILITIES,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
} from "../src";

describe("@excited-live/accounting - Wealth and Projections Characterization", () => {
	const personalAccount = SEED_ACCOUNTS.find((a) => a.id === "acc_personal")!;
	const bizAccount = SEED_ACCOUNTS.find((a) => a.id === "acc_fromsukong")!;

	it("calculates personal entity wealth metrics deterministically", () => {
		const metrics = calculateEntityWealthMetrics({
			account: personalAccount,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
			yearMonth: "2026-10",
		});

		expect(metrics.cashAssetsValue).toBeGreaterThan(0);
		expect(metrics.gearAssetsValue).toBeGreaterThan(0);
		expect(metrics.totalAssetsValue).toBe(
			metrics.cashAssetsValue + metrics.gearAssetsValue,
		);
		expect(metrics.currentWealth).toBe(
			metrics.currentLiquid + metrics.gearAssetsValue,
		);
		expect(metrics.liquidPct + metrics.gearPct).toBe(100);
	});

	it("calculates business entity wealth metrics deterministically", () => {
		const metrics = calculateEntityWealthMetrics({
			account: bizAccount,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
			yearMonth: "2026-10",
		});

		expect(metrics.totalIncome).toBe(25000); // 20k transfer + 5k retainer
		expect(metrics.isDefaultAlive).toBe(true);
	});

	it("calculates consolidated wealth from cash assets, ignoring the deprecated cashReserve field", () => {
		const consolidated = calculateConsolidatedWealthMetrics({
			accounts: SEED_ACCOUNTS,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
		});

		const personalLiquid = calculateEntityWealthMetrics({
			account: personalAccount,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
			yearMonth: "2026-10",
		}).currentLiquid;
		const bizLiquid = calculateEntityWealthMetrics({
			account: bizAccount,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
			yearMonth: "2026-10",
		}).currentLiquid;

		expect(consolidated.totalTreasury).toBeGreaterThan(0);
		expect(consolidated.personalCash).toBe(personalLiquid);
		expect(consolidated.businessCash).toBe(bizLiquid);
		expect(consolidated.totalTreasury).toBe(personalLiquid + bizLiquid);
		expect(consolidated.totalTreasury).not.toBe(
			SEED_ACCOUNTS.reduce((acc, a) => acc + a.cashReserve, 0),
		);
	});

	it("calculates pure payday countdown without hidden time drift", () => {
		// Mock date: Oct 18, 2026
		const oct18 = new Date(2026, 9, 18);
		expect(calculatePaydayCountdown(18, oct18)).toBe("Payday today");
		expect(calculatePaydayCountdown(19, oct18)).toBe("Payday tomorrow");
		expect(calculatePaydayCountdown(28, oct18)).toBe("Payday in 10 days");
		// Payday earlier in the month (e.g. 5th) -> wraps to next month (31 - 18 + 5 = 18 days)
		expect(calculatePaydayCountdown(5, oct18)).toBe("Payday in 18 days");
		expect(calculatePaydayCountdown(undefined, oct18)).toBeNull();
	});

	it("calculates multi-month projection balances", () => {
		const projection = calculateProjectionBalances({
			account: personalAccount,
			yearMonth: "2026-10",
			subscriptions: SEED_SUBSCRIPTIONS,
			hardware: SEED_HARDWARE,
			revenues: SEED_REVENUES,
			transfers: SEED_TRANSFERS,
			liabilities: SEED_LIABILITIES,
			pastMonths: 3,
			futureMonths: 6,
		});

		expect(projection.offsets).toHaveLength(10); // -3, -2, -1, 0, 1, 2, 3, 4, 5, 6
		// The "now" anchor is today's derived treasury, not the deprecated
		// cashReserve field (always 0).
		const nowTreasury = calculateCurrentTreasury({
			account: personalAccount,
			hardware: SEED_HARDWARE,
			transfers: SEED_TRANSFERS,
		});
		expect(nowTreasury).toBeGreaterThan(0);
		expect(projection.balances.get(0)).toBe(nowTreasury);
		expect(projection.balances.size).toBe(10);
	});
});
