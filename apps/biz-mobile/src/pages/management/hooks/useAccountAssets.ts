import { useMemo } from "react";
import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	isCashAsset,
	round2,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import { useFinances } from "../../../state";

export interface AccountAssetsSlice {
	cashAssets: HardwareAsset[];
	gearAssets: HardwareAsset[];
	totalLiquidReserves: number;
	totalBookValue: number;
	totalDepreciation: number;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
}

export function useAccountAssets(
	activeAccount: EntityAccount,
	selectedMonth: string,
): AccountAssetsSlice {
	const { hardware, transfers, subscriptions, revenues, liabilities } = useFinances();

	return useMemo(() => {
		if (!activeAccount) {
			return {
				cashAssets: [],
				gearAssets: [],
				totalLiquidReserves: 0,
				totalBookValue: 0,
				totalDepreciation: 0,
				hardware,
				transfers,
				subscriptions,
				revenues,
				liabilities,
			};
		}

		const entityHw = hardware.filter((h) => h.entityId === activeAccount.id);
		const cashAssets = entityHw.filter((h) => isCashAsset(h));
		const gearAssets = entityHw.filter((h) => !isCashAsset(h));

		const totalLiquidReserves = round2(
			cashAssets.reduce((acc, h) => {
				const bal = calculateCashAssetBalance({
					asset: h,
					hardware,
					transfers,
					account: activeAccount,
					subscriptions,
					revenues,
					liabilities,
					yearMonth: selectedMonth,
				});
				return acc + bal.effectiveBalance;
			}, 0),
		);

		const totalBookValue = round2(
			gearAssets.reduce(
				(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).remainingBookValue,
				0,
			),
		);

		const totalDepreciation = round2(
			gearAssets.reduce(
				(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).monthlyRate,
				0,
			),
		);

		return {
			cashAssets,
			gearAssets,
			totalLiquidReserves,
			totalBookValue,
			totalDepreciation,
			hardware,
			transfers,
			subscriptions,
			revenues,
			liabilities,
		};
	}, [activeAccount, selectedMonth, hardware, transfers, subscriptions, revenues, liabilities]);
}
