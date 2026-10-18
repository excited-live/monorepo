import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateConsolidatedWealth,
	calculateConsolidatedWealthMetrics,
	calculateEntityWealthMetrics,
	calculatePaydayCountdown,
	calculateProjectionBalances,
	generateMonthlyLedger,
	isCashAsset,
	round2,
	shiftYearMonth,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/accounting";
import type { CashWalletViewModel, GearAssetViewModel } from "./types";

// Re-export pure calculations from the @excited-live/accounting engine
export {
	calculateEntityWealthMetrics,
	calculateConsolidatedWealthMetrics,
	calculateConsolidatedWealth,
	calculatePaydayCountdown,
	calculateProjectionBalances,
	shiftYearMonth,
};

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
 * Pure ViewModel Selector: cash outflows of one month grouped into waterfall
 * categories, taken from the ledger so they sum to the ledger's outflow total
 * (one-time items only in their month, transfers and debt service included).
 * Sorted largest first.
 */
export function selectMonthlyExpenseBreakdown(params: {
	account: EntityAccount;
	yearMonth: string;
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities: LiabilityStream[];
}): Array<[string, number]> {
	const { actions } = generateMonthlyLedger(params);
	const byCategory = new Map<string, number>();
	for (const action of actions) {
		if (action.direction !== "outflow" || action.category === "asset_depreciation") continue;
		const rawCat = action.category || "Subscriptions";
		const label =
			rawCat === "transfer"
				? "Capital"
				: rawCat === "liability"
					? "Liability"
					: rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
		byCategory.set(label, round2((byCategory.get(label) ?? 0) + action.amount));
	}
	return Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
}
