import { describe, expect, it } from "vitest";
import {
	calculateConsolidatedWealthMetrics,
	calculateEntityWealthMetrics,
	calculatePaydayCountdown,
	calculateProjectionBalances,
	recordTransfer,
	round2,
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

	it("calculates consolidated wealth as cash on hand for the month", () => {
		const consolidated = calculateConsolidatedWealthMetrics({
			accounts: SEED_ACCOUNTS,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
		});

		// Cash in hand during 2026-10: wallets + transfers dated through the month
		expect(consolidated.personalCash).toBe(52130);
		expect(consolidated.businessCash).toBe(44447.5);
		expect(consolidated.totalTreasury).toBe(96577.5);
		// End of month reproduces the seeded demo balances (125,000 + 45,000)
		expect(consolidated.totalEomTreasury).toBe(170000);
	});

	it("reflects this month's capital transfer in cash on hand, never next month's", () => {
		const snapshot = {
			accounts: SEED_ACCOUNTS,
			hardware: SEED_HARDWARE,
			subscriptions: SEED_SUBSCRIPTIONS,
			revenues: SEED_REVENUES,
			liabilities: SEED_LIABILITIES,
			transfers: SEED_TRANSFERS,
		};
		const consolidatedOf = (s: typeof snapshot) =>
			calculateConsolidatedWealthMetrics({
				accounts: s.accounts,
				hardware: s.hardware,
				subscriptions: s.subscriptions,
				revenues: s.revenues,
				liabilities: s.liabilities,
				transfers: s.transfers,
			});

		const transfer = (date: string) =>
			recordTransfer(
				{ ...snapshot },
				{
					fromEntityId: personalAccount.id,
					toEntityId: bizAccount.id,
					amount: 5000,
					date,
					note: "Deploy capital",
				},
			).snapshot;

		// A transfer dated inside the viewed month moves both sides immediately.
		const inMonth = consolidatedOf(transfer("2026-10-15"));
		expect(inMonth.personalCash).toBe(47130);
		expect(inMonth.businessCash).toBe(49447.5);

		// One dated next month stays out of the current month's cash on hand.
		const nextMonth = consolidatedOf(transfer("2026-11-15"));
		expect(nextMonth.personalCash).toBe(52130);
		expect(nextMonth.businessCash).toBe(44447.5);
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
		// "Now" is the opening treasury of the selected month, not account.cashReserve
		expect(projection.balances.get(0)).toBe(72130);
		expect(projection.balances.get(1)).toBe(round2(72130 + projection.projectedNet));
		expect(projection.balances.size).toBe(10);
	});
});
