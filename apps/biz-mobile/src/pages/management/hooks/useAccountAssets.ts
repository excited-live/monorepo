import { useMemo } from "react";
import {
	round2,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import {
	selectCashWalletViewModels,
	selectGearAssetViewModels,
} from "../../../domain/selectors";
import type {
	CashWalletViewModel,
	GearAssetViewModel,
} from "../../../domain/types";
import { useFinances } from "../../../state";

export interface AccountAssetsSlice {
	cashWallets: CashWalletViewModel[];
	gearAssets: GearAssetViewModel[];
	// Backwards compatibility aliases
	cashAssets: HardwareAsset[];
	gearHardware: HardwareAsset[];
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
				cashWallets: [],
				gearAssets: [],
				cashAssets: [],
				gearHardware: [],
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

		const cashWallets = selectCashWalletViewModels({
			account: activeAccount,
			hardware,
			transfers,
			subscriptions,
			revenues,
			liabilities,
			yearMonth: selectedMonth,
		});

		const gearAssets = selectGearAssetViewModels({
			account: activeAccount,
			hardware,
			yearMonth: selectedMonth,
		});

		const totalLiquidReserves = round2(
			cashWallets.reduce((acc, w) => acc + w.projectedEomBalance, 0),
		);

		const totalBookValue = round2(
			gearAssets.reduce((acc, g) => acc + g.remainingBookValue, 0),
		);

		const totalDepreciation = round2(
			gearAssets.reduce((acc, g) => acc + g.monthlyDepreciation, 0),
		);

		return {
			cashWallets,
			gearAssets,
			cashAssets: cashWallets.map((w) => w.raw),
			gearHardware: gearAssets.map((g) => g.raw),
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
