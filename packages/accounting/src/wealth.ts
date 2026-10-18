import { calculateAssetDepreciation, isCashAsset, round2, shiftYearMonth } from "./math";
import {
	calculateCashAssetBalance,
	calculateDerivedTreasury,
	calculateEntityCashOnHand,
	calculateEntityMonthlyCashFlow,
	calculateOpeningTreasury,
	calculateTreasuryAsOf,
	DEFAULT_BASELINE_MONTH,
	generateMonthlyLedger,
	isLiabilityInMonth,
	liabilityPaymentInMonth,
} from "./ledger";
import type {
	Account,
	Asset,
	ConsolidatedWealthMetrics,
	EntityWealthMetrics,
	Expense,
	Income,
	Liability,
	ProjectionBalances,
	Transfer,
} from "./types";

/**
 * Calculates detailed wealth and balance metrics for a specific account.
 * Pure function: operates without DOM, state, or framework dependencies.
 */
export function calculateEntityWealthMetrics(params: {
	account: Account;
	hardware: Asset[];
	subscriptions: Expense[];
	revenues: Income[];
	liabilities: Liability[];
	transfers: Transfer[];
	yearMonth?: string;
	/** Today (YYYY-MM-DD). When inside yearMonth, "current" values are as of this day. */
	asOfDate?: string;
}): EntityWealthMetrics {
	const {
		account,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		yearMonth = "2026-10",
		asOfDate,
	} = params;

	const entityAssets = hardware.filter((h) => h.entityId === account.id);
	const cashAssets = entityAssets.filter((h) => isCashAsset(h));
	const cashAssetsValue = round2(
		cashAssets.reduce((acc, h) => {
			const bal = calculateCashAssetBalance({
				asset: h,
				hardware,
				transfers,
				account,
				subscriptions,
				revenues,
				liabilities,
				yearMonth,
			});
			return acc + bal.effectiveBalance;
		}, 0),
	);
	// Investments are valued by calculateInvestmentValue, not as gear.
	const gearAssets = entityAssets.filter((h) => !isCashAsset(h) && h.kind !== "investment");
	const gearAssetsValue = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, yearMonth).remainingBookValue,
			0,
		),
	);
	const totalAssetsValue = round2(gearAssetsValue + cashAssetsValue);

	// Compute cashflow ledger for the selected month to derive accurate runway & runrate
	const ledger = generateMonthlyLedger({
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
	});

	const {
		startingTreasury,
		endingTreasury,
		totalInflow,
		totalCashOutflow,
		runwayMonths = null,
		isDefaultAlive = false,
	} = ledger.summary;

	const currentLiquid =
		asOfDate && asOfDate.startsWith(yearMonth)
			? calculateTreasuryAsOf({ account, hardware, transfers, subscriptions, revenues, liabilities, asOfDate })
			: startingTreasury;
	const eomLiquid = endingTreasury;

	const currentWealth = round2(currentLiquid + gearAssetsValue);
	const eomWealth = round2(eomLiquid + gearAssetsValue);
	const liquidPct = currentWealth > 0 ? Math.round((currentLiquid / currentWealth) * 100) : 0;
	const gearPct = 100 - liquidPct;

	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && isLiabilityInMonth(l, yearMonth))
			.reduce((acc, l) => acc + liabilityPaymentInMonth(l, yearMonth, transfers), 0),
	);

	const totalIncome = totalInflow;
	const totalExpense = round2(Math.max(0, totalCashOutflow - liabilityMonthly));

	const liabPct =
		totalIncome > 0
			? Math.min(100, Math.round((liabilityMonthly / totalIncome) * 100))
			: liabilityMonthly > 0
				? 100
				: 0;

	return {
		cashAssetsValue,
		gearAssetsValue,
		totalAssetsValue,
		currentLiquid,
		eomLiquid,
		currentWealth,
		eomWealth,
		liquidPct,
		gearPct,
		totalIncome,
		totalExpense,
		liabilityMonthly,
		liabPct,
		runwayMonths,
		isDefaultAlive,
	};
}

/**
 * Calculates aggregated wealth metrics across all accounts (personal + businesses).
 * Pure function: operates without DOM, state, or framework dependencies.
 */
export function calculateConsolidatedWealthMetrics(params: {
	accounts: Account[];
	hardware: Asset[];
	subscriptions: Expense[];
	revenues: Income[];
	liabilities: Liability[];
	transfers: Transfer[];
	yearMonth?: string;
}): ConsolidatedWealthMetrics {
	const {
		accounts,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		yearMonth = DEFAULT_BASELINE_MONTH,
	} = params;

	// "Current" is cash in hand: transfers dated through the month are applied
	// (a capital transfer recorded this month moves the total immediately),
	// future months are not. The end-of-month figure keeps the projected close.
	const cashOnHand = new Map(
		accounts.map((account) => [
			account.id,
			calculateEntityCashOnHand({ account, hardware, transfers, subscriptions, revenues, liabilities, yearMonth }),
		]),
	);
	const cashOnHandOf = (account: Account) => cashOnHand.get(account.id) ?? 0;

	const personal = accounts.find((a) => a.type === "personal");
	const personalCash = personal ? cashOnHandOf(personal) : 0;
	const businessCash = accounts
		.filter((a) => a.type === "business")
		.reduce((acc, a) => acc + cashOnHandOf(a), 0);

	const totalTreasury = accounts.reduce((acc, a) => acc + cashOnHandOf(a), 0);
	const totalEomTreasury = accounts.reduce((acc, a) => {
		const eom = calculateDerivedTreasury({
			account: a,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
			yearMonth,
		});
		return acc + eom;
	}, 0);

	return {
		totalTreasury: round2(totalTreasury),
		totalEomTreasury: round2(totalEomTreasury),
		personalCash: round2(personalCash),
		businessCash: round2(businessCash),
	};
}

export const calculateConsolidatedWealth = calculateConsolidatedWealthMetrics;

/**
 * Calculates human-readable payday countdown label for a given day of the month.
 * Pure function when now is provided.
 */
export function calculatePaydayCountdown(
	dayOfMonth?: number,
	now: Date = new Date(),
): string | null {
	if (!dayOfMonth) return null;
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const today = now.getDate();
	let daysUntil = dayOfMonth - today;
	if (daysUntil < 0) daysUntil = daysInMonth - today + dayOfMonth;
	if (daysUntil === 0) return "Payday today";
	if (daysUntil === 1) return "Payday tomorrow";
	return `Payday in ${daysUntil} days`;
}

/**
 * Calculates month-by-month cashflow ledger projection balances.
 */
export function calculateProjectionBalances(params: {
	account: Account;
	yearMonth: string;
	subscriptions: Expense[];
	hardware: Asset[];
	revenues: Income[];
	transfers: Transfer[];
	liabilities: Liability[];
	pastMonths?: number;
	futureMonths?: number;
	/** Today (YYYY-MM-DD). When inside yearMonth, the "Now" point is as of this day. */
	asOfDate?: string;
}): ProjectionBalances {
	const {
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
		pastMonths = 6,
		futureMonths = 12,
		asOfDate,
	} = params;

	const flowOf = (ym: string) =>
		calculateEntityMonthlyCashFlow({ account, transfers, subscriptions, revenues, liabilities, hardware, yearMonth: ym });

	// Waterfall figures for the selected month, straight from the ledger so the
	// bars add up to the same net the balance line uses.
	const selected = flowOf(yearMonth);
	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && isLiabilityInMonth(l, yearMonth))
			.reduce((acc, l) => acc + liabilityPaymentInMonth(l, yearMonth, transfers), 0),
	);
	const totalIncome = selected.inflow;
	const totalExpense = round2(Math.max(0, selected.outflow - liabilityMonthly));
	const projectedNet = selected.net;

	const offsets: number[] = [];
	for (let m = -pastMonths; m <= futureMonths; m++) offsets.push(m);

	// balances.get(m) = treasury at the start of month (yearMonth + m)
	const balances = new Map<number, number>();
	balances.set(
		0,
		calculateOpeningTreasury({ account, hardware, transfers, subscriptions, revenues, liabilities, yearMonth }),
	);

	for (let m = -1; m >= -pastMonths; m--) {
		balances.set(m, round2((balances.get(m + 1) ?? 0) - flowOf(shiftYearMonth(yearMonth, m)).net));
	}

	for (let m = 1; m <= futureMonths; m++) {
		balances.set(m, round2((balances.get(m - 1) ?? 0) + flowOf(shiftYearMonth(yearMonth, m - 1)).net));
	}

	// The "Now" point shows today's balance when viewing the current month; the
	// other points stay on month starts.
	if (asOfDate && asOfDate.startsWith(yearMonth)) {
		balances.set(
			0,
			calculateTreasuryAsOf({ account, hardware, transfers, subscriptions, revenues, liabilities, asOfDate }),
		);
	}

	return {
		offsets,
		balances,
		totalIncome,
		totalExpense,
		liabilityMonthly,
		projectedNet,
	};
}
