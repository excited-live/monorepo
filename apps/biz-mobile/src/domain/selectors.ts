import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateDerivedTreasury,
	calculateMonthlyEquivalent,
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
	CashWalletViewModel,
	ConsolidatedWealthMetrics,
	EntityWealthMetrics,
	GearAssetViewModel,
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

export const calculateConsolidatedWealth = calculateConsolidatedWealthMetrics;

/**
 * Pure ViewModel Selector: transforms raw cash hardware entries into rich CashWalletViewModels.
 * Strictly separates Stock (current balance in hand today) from Flow (net monthly operating cash).
 */
export function selectCashWalletViewModels(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	yearMonth?: string;
}): CashWalletViewModel[] {
	const {
		account,
		hardware,
		transfers,
		subscriptions,
		revenues,
		liabilities,
		yearMonth = "2026-10",
	} = params;

	const cashAssets = hardware.filter((h) => h.entityId === account.id && isCashAsset(h));

	return cashAssets.map((asset) => {
		const bal = calculateCashAssetBalance({
			asset,
			hardware,
			transfers,
			account,
			subscriptions,
			revenues,
			liabilities,
			yearMonth,
		});

		return {
			id: asset.id,
			name: asset.name,
			openingBalance: bal.baseCost,
			transfers: bal.assetInjections,
			currentBalance: bal.currentCashOnHand,
			monthlyNetFlow: bal.netOperatingCash,
			projectedEomBalance: bal.effectiveBalance,
			isDefault: bal.isDefault,
			imageUrl: asset.imageUrl,
			raw: asset,
		};
	});
}

/**
 * Pure ViewModel Selector: transforms raw gear hardware into rich GearAssetViewModels with depreciation math.
 */
export function selectGearAssetViewModels(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	yearMonth?: string;
}): GearAssetViewModel[] {
	const { account, hardware, yearMonth = "2026-10" } = params;

	const gearAssets = hardware.filter((h) => h.entityId === account.id && !isCashAsset(h));

	return gearAssets.map((asset) => {
		const dep = calculateAssetDepreciation(asset, yearMonth);
		return {
			id: asset.id,
			name: asset.name,
			category: asset.category,
			cost: asset.cost,
			purchaseDate: asset.purchaseDate,
			lifespanMonths: asset.lifespanMonths,
			remainingBookValue: dep.remainingBookValue,
			monthlyDepreciation: dep.monthlyRate,
			isFullyDepreciated: dep.isFullyDepreciated,
			completionDate: dep.completionDate,
			imageUrl: asset.imageUrl,
			raw: asset,
		};
	});
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

	const entityRevenues = revenues.filter((r) => r.entityId === account.id && r.active);
	const hasSalaryStream = entityRevenues.some((r) => r.source === "salary");
	const legacySalary = !hasSalaryStream && account.type === "personal" ? (account.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
			entityRevenues
				.filter((r) => r.frequency === "monthly")
				.reduce((acc, r) => acc + r.amount, 0),
	);
	const totalExpense = round2(
		subscriptions
			.filter((s) => s.entityId === account.id && s.active)
			.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
	);
	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && l.active)
			.reduce((acc, l) => acc + l.amount, 0),
	);
	const projectedNet = round2(totalIncome - totalExpense - liabilityMonthly);

	const offsets: number[] = [];
	for (let m = -pastMonths; m <= futureMonths; m++) offsets.push(m);

	const balances = new Map<number, number>();
	balances.set(0, account.cashReserve);

	for (let m = -1; m >= -pastMonths; m--) {
		balances.set(
			m,
			round2((balances.get(m + 1) ?? 0) - netOf(shiftYearMonth(yearMonth, m + 1), { ...account, salary: undefined })),
		);
	}

	for (let m = 1; m <= futureMonths; m++) {
		const ym = shiftYearMonth(yearMonth, m);
		const ledgerNet = netOf(ym, account);
		balances.set(m, round2((balances.get(m - 1) ?? 0) + ledgerNet));
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
