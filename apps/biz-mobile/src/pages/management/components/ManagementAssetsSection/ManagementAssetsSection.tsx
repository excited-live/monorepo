import React from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { formatMoney } from "../../../../utils/format";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";
import type { CashWalletViewModel, GearAssetViewModel } from "../../../../domain/types";
import { selectCashWalletViewModels, selectGearAssetViewModels } from "../../../../domain/selectors";
import { EmptyCard, ItemRow, SectionHeader } from "../../../../components";
import { t } from "../../../../utils/i18n";
import { BADGE_TONE_CLASS } from "../../../../utils/ui";

export interface ManagementAssetsSectionProps {
	activeAccount?: EntityAccount;
	cashWallets?: CashWalletViewModel[];
	gearAssets?: GearAssetViewModel[] | HardwareAsset[];
	cashAssets?: HardwareAsset[];
	hardware?: HardwareAsset[];
	transfers?: CapitalTransfer[];
	subscriptions?: RecurringSubscription[];
	revenues?: RevenueStream[];
	liabilities?: LiabilityStream[];
	totalLiquidReserves: number;
	totalBookValue: number;
	totalDepreciation: number;
	selectedMonth?: string;
	lang?: "en" | "th";
	onAddAsset?: () => void;
	onSelectHardware?: (hw: HardwareAsset) => void;
}

export const ManagementAssetsSection: React.FC<ManagementAssetsSectionProps> = ({
	activeAccount,
	cashWallets: propCashWallets,
	gearAssets: propGearAssets,
	cashAssets,
	hardware = [],
	transfers = [],
	subscriptions = [],
	revenues = [],
	liabilities = [],
	totalLiquidReserves,
	totalBookValue,
	totalDepreciation,
	selectedMonth = "2026-10",
	lang = "en",
	onAddAsset = () => {},
	onSelectHardware = () => {},
}) => {
	// Derive pure view models if not directly provided (full backward compatibility)
	const resolvedWallets: CashWalletViewModel[] = React.useMemo(() => {
		if (propCashWallets) return propCashWallets;
		if (activeAccount) {
			return selectCashWalletViewModels({
				account: activeAccount,
				hardware: hardware.length > 0 ? hardware : (cashAssets ?? []),
				transfers,
				subscriptions,
				revenues,
				liabilities,
				yearMonth: selectedMonth,
			});
		}
		return [];
	}, [propCashWallets, activeAccount, hardware, cashAssets, transfers, subscriptions, revenues, liabilities, selectedMonth]);

	const resolvedGear: GearAssetViewModel[] = React.useMemo(() => {
		if (propGearAssets && propGearAssets.length > 0 && "remainingBookValue" in propGearAssets[0]!) {
			return propGearAssets as GearAssetViewModel[];
		}
		if (activeAccount) {
			const gearHw = (propGearAssets as HardwareAsset[]) ?? hardware;
			return selectGearAssetViewModels({
				account: activeAccount,
				hardware: gearHw,
				yearMonth: selectedMonth,
			});
		}
		return [];
	}, [propGearAssets, activeAccount, hardware, selectedMonth]);

	const totalCashOnHand = resolvedWallets.reduce((sum, w) => sum + w.currentBalance, 0);
	const signed = (n: number) => `${n >= 0 ? "+" : ""}฿${formatMoney(n)}`;

	return (
		<Stack gap={4} width="100%">
			{/* Liquid Cash Section */}
			<Stack gap={2} width="100%">
				<SectionHeader
					title={t("section.liquidReserves", lang)}
					subtitle={`Total Cash on Hand: ฿${formatMoney(totalCashOnHand)} • Projected EOM: ฿${formatMoney(totalLiquidReserves)}`}
					actions={<Button label="+ Add Asset" size="sm" variant="primary" onClick={onAddAsset} />}
				/>

				{resolvedWallets.length === 0 ? (
					<EmptyCard isCompact>No cash/reserve accounts tracked. Tap "+ Add Asset" to add cash reserves.</EmptyCard>
				) : (
					<Stack gap={2} width="100%">
						{resolvedWallets.map((wallet) => (
							<ItemRow
								key={wallet.id}
								name={wallet.name}
								imageUrl={wallet.imageUrl}
								fallback="฿"
								title={
									<HStack gap={1.5} align="center">
										<Text maxLines={1} className="text-[15px] font-semibold text-ink">
											{wallet.name}
										</Text>
										{wallet.isDefault && (
											<Badge variant="neutral" label="DEFAULT" className={BADGE_TONE_CLASS.negative} />
										)}
									</HStack>
								}
								sub={
									wallet.isDefault
										? `Opening: ฿${formatMoney(wallet.openingBalance)}${
												wallet.transfers !== 0 ? ` • Transfers: ${signed(wallet.transfers)}` : ""
											}${wallet.monthlyNetFlow !== 0 ? ` • Net Flow: ${signed(wallet.monthlyNetFlow)}` : ""} • EOM: ฿${formatMoney(wallet.projectedEomBalance)}`
										: `Opening: ฿${formatMoney(wallet.openingBalance)}${
												wallet.transfers !== 0 ? ` • Transfers: ${signed(wallet.transfers)}` : ""
											} • Liquid Reserve`
								}
								amount={`฿${formatMoney(wallet.currentBalance)}`}
								tone={wallet.currentBalance >= 0 ? "positive" : "negative"}
								badge="CASH"
								badgeTone="positive"
								onClick={() => onSelectHardware(wallet.raw)}
							/>
						))}
					</Stack>
				)}
			</Stack>

			{/* Physical Hardware Section */}
			<Stack gap={2} width="100%">
				<SectionHeader
					title="Physical Hardware & Equipment"
					subtitle={`Book Value: ฿${formatMoney(totalBookValue)} • Dep: -฿${formatMoney(totalDepreciation)}/mo`}
				/>

				{resolvedGear.length === 0 ? (
					<EmptyCard>No depreciating hardware assets recorded for this entity.</EmptyCard>
				) : (
					<Stack gap={2} width="100%">
						{resolvedGear.map((gear) => {
							const pctRemaining = gear.cost > 0 ? (gear.remainingBookValue / gear.cost) * 100 : 0;

							return (
								<ItemRow
									key={gear.id}
									name={gear.name}
									imageUrl={gear.imageUrl}
									sub={`Bought ${gear.purchaseDate} • Cost: ฿${formatMoney(gear.cost)}`}
									details={
										<HStack gap={2} align="center">
											<Text className="text-[12px] text-slate">
												{Math.round(pctRemaining)}% remaining • {gear.completionDate !== "N/A" ? `Depreciates until ${gear.completionDate}` : "Fully depreciated"}
											</Text>
										</HStack>
									}
									amount={`฿${formatMoney(gear.remainingBookValue)}`}
									badge={gear.monthlyDepreciation > 0 ? `-฿${formatMoney(gear.monthlyDepreciation)}/mo` : "PAID OFF"}
									badgeTone={gear.monthlyDepreciation > 0 ? "negative" : "neutral"}
									onClick={() => onSelectHardware(gear.raw)}
								/>
							);
						})}
					</Stack>
				)}
			</Stack>
		</Stack>
	);
};
