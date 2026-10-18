import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateConsolidatedWealth,
	calculateConsolidatedWealthMetrics,
	calculateEntityWealthMetrics,
	calculatePaydayCountdown,
	calculateProjectionBalances,
	isCashAsset,
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
 * Current spendable cash for one entity: the sum of its cash assets' balances
 * (net of transfers). Use this instead of the deprecated `cashReserve` field,
 * which is always 0 now that cash lives in asset rows.
 */
export function selectEntityCurrentLiquid(params: {
	account: EntityAccount;
	hardware: HardwareAsset[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	yearMonth?: string;
}): number {
	return calculateEntityWealthMetrics(params).currentLiquid;
}

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
