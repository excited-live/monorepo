import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateDerivedTreasury,
	calculateRunway,
	generateMonthlyLedger,
	isCashAsset,
	round2,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import type {
	ConsolidatedWealthMetrics,
	EntityWealthMetrics,
} from "./types";

/**
 * Calculates detailed wealth and balance metrics for a specific entity account.
 * Pure function: operates without DOM, state, or framework dependencies.
 */
export function calculateEntityWealthMetrics(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	yearMonth?: string;
}): EntityWealthMetrics {
	const {
		account,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		yearMonth = "2026-10",
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
	const gearAssets = entityAssets.filter((h) => !isCashAsset(h));
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
	} = ledger.summary;

	const currentLiquid = startingTreasury;
	const eomLiquid = endingTreasury;

	const currentWealth = round2(currentLiquid + gearAssetsValue);
	const eomWealth = round2(eomLiquid + gearAssetsValue);
	const liquidPct = currentWealth > 0 ? Math.round((currentLiquid / currentWealth) * 100) : 0;
	const gearPct = 100 - liquidPct;

	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && l.active)
			.reduce((acc, l) => acc + l.amount, 0),
	);

	const totalIncome = totalInflow;
	const totalExpense = round2(Math.max(0, totalCashOutflow - liabilityMonthly));

	const liabPct =
		totalIncome > 0
			? Math.min(100, Math.round((liabilityMonthly / totalIncome) * 100))
			: liabilityMonthly > 0
				? 100
				: 0;

	const netBurn = Math.max(0, round2(totalCashOutflow - totalInflow));
	const runwayMonths = calculateRunway(currentLiquid, netBurn);
	const isDefaultAlive = totalInflow > 0 && totalInflow >= totalCashOutflow;

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
	accounts: EntityAccount[];
	hardware: HardwareAsset[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
}): ConsolidatedWealthMetrics {
	const { accounts, hardware, subscriptions, revenues, liabilities, transfers } = params;

	const personal = accounts.find((a) => a.type === "personal");
	const personalCash = personal?.cashReserve ?? 0;
	const businessCash = accounts
		.filter((a) => a.type === "business")
		.reduce((acc, a) => acc + a.cashReserve, 0);

	const totalTreasury = accounts.reduce((acc, a) => acc + a.cashReserve, 0);
	const totalEomTreasury = accounts.reduce((acc, a) => {
		const eom = calculateDerivedTreasury({
			account: a,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
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

/**
 * Calculates human-readable payday countdown label for a given day of the month.
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
 * Shifts year-month string ("YYYY-MM") by a delta offset in months.
 */
export function shiftYearMonth(ym: string, delta: number): string {
	const [y, m] = ym.split("-").map(Number);
	const zeroBased = (m ?? 1) - 1 + delta;
	const nextYear = (y ?? 0) + Math.floor(zeroBased / 12);
	const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
	return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

/**
 * Calculates month-by-month cashflow ledger projection balances.
 */
export function calculateProjectionBalances(params: {
	account: EntityAccount;
	yearMonth: string;
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities: LiabilityStream[];
	pastMonths?: number;
	futureMonths?: number;
}): {
	offsets: number[];
	balances: Map<number, number>;
	totalIncome: number;
	totalExpense: number;
	liabilityMonthly: number;
	projectedNet: number;
} {
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
	} = params;

	const netOf = (ym: string, acc: EntityAccount = account) =>
		generateMonthlyLedger({
			account: acc,
			yearMonth: ym,
			subscriptions,
			hardware,
			revenues,
			transfers,
			liabilities,
		}).summary.netCashFlow;

	const baselineLedger = generateMonthlyLedger({
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
	});

	const offsets: number[] = [];
	for (let i = -pastMonths; i <= futureMonths; i++) {
		offsets.push(i);
	}

	const balances = new Map<number, number>();
	let running = account.cashReserve;
	for (let i = -pastMonths; i <= futureMonths; i++) {
		const targetYm = shiftYearMonth(yearMonth, i);
		if (i === 0) {
			running = baselineLedger.summary.endingTreasury;
		} else if (i < 0) {
			const pastNet = netOf(targetYm);
			running = round2(running - pastNet);
		} else {
			const futureNet = netOf(targetYm);
			running = round2(running + futureNet);
		}
		balances.set(i, running);
	}

	return {
		offsets,
		balances,
		totalIncome: baselineLedger.summary.totalInflow,
		totalExpense: baselineLedger.summary.totalCashOutflow,
		liabilityMonthly: round2(
			liabilities
				.filter((l) => l.entityId === account.id && l.active)
				.reduce((acc, l) => acc + l.amount, 0),
		),
		projectedNet: baselineLedger.summary.netCashFlow,
	};
}

export const calculateConsolidatedWealth = calculateConsolidatedWealthMetrics;
