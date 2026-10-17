import React from "react";
import { Badge, Button, HStack, Stack, Text } from "@excited-live/design-system";
import { EmptyCard, ItemRow, SectionHeader } from "../../../../components";
import { BADGE_TONE_CLASS } from "../../../../utils/ui";
import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementAssetsSectionProps {
	activeAccount: EntityAccount;
	hardware: HardwareAsset[];
	transfers: CapitalTransfer[];
	subscriptions: RecurringSubscription[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	selectedMonth: string;
	cashAssets: HardwareAsset[];
	gearAssets: HardwareAsset[];
	totalLiquidReserves: number;
	totalBookValue: number;
	totalDepreciation: number;
	lang?: MobileLocale;
	onAddAsset?: () => void;
	onSelectHardware?: (hw: HardwareAsset) => void;
}

export const ManagementAssetsSection: React.FC<ManagementAssetsSectionProps> = ({
	activeAccount,
	hardware,
	transfers,
	subscriptions,
	revenues,
	liabilities,
	selectedMonth,
	cashAssets,
	gearAssets,
	totalLiquidReserves,
	totalBookValue,
	totalDepreciation,
	lang = "en",
	onAddAsset = () => {},
	onSelectHardware = () => {},
}) => {
	return (
		<Stack gap={4} width="100%">
			{/* Liquid Cash Section */}
			<Stack gap={2} width="100%">
				<SectionHeader
					title={t("section.liquidReserves", lang)}
					subtitle={`Total Cash: ฿${formatMoney(totalLiquidReserves)} (Held at 100% value)`}
					actions={<Button label="+ Add Asset" size="sm" variant="primary" onClick={onAddAsset} />}
				/>

				{cashAssets.length === 0 ? (
					<EmptyCard isCompact>No cash/reserve accounts tracked. Tap "+ Add Asset" to add cash reserves.</EmptyCard>
				) : (
					<Stack gap={2} width="100%">
						{cashAssets.map((hw) => {
							const assetBal = calculateCashAssetBalance({
								asset: hw,
								hardware,
								transfers,
								account: activeAccount,
								subscriptions,
								revenues,
								liabilities,
								yearMonth: selectedMonth,
							});
							const signed = (n: number) => `${n >= 0 ? "+" : ""}฿${formatMoney(n)}`;
							return (
								<ItemRow
									key={hw.id}
									name={hw.name}
									imageUrl={hw.imageUrl}
									fallback="฿"
									title={
										<HStack gap={1.5} align="center">
											<Text maxLines={1} className="text-[15px] font-semibold text-ink">
												{hw.name}
											</Text>
											{assetBal.isDefault && (
												<Badge variant="neutral" label="DEFAULT" className={BADGE_TONE_CLASS.negative} />
											)}
										</HStack>
									}
									sub={
										assetBal.isDefault
											? `Base: ฿${formatMoney(assetBal.baseCost)}${
													assetBal.assetInjections !== 0 ? ` • Cap: ${signed(assetBal.assetInjections)}` : ""
												}${assetBal.netOperatingCash !== 0 ? ` • Net Flow: ${signed(assetBal.netOperatingCash)}` : ""}`
											: `Liquid Reserve${
													assetBal.assetInjections !== 0
														? ` • Injected: ฿${formatMoney(assetBal.assetInjections)}`
														: " (No Depreciation)"
												}`
									}
									amount={`฿${formatMoney(assetBal.effectiveBalance)}`}
									tone={assetBal.effectiveBalance >= 0 ? "positive" : "negative"}
									badge="CASH"
									badgeTone="positive"
									onClick={() => onSelectHardware(hw)}
								/>
							);
						})}
					</Stack>
				)}
			</Stack>

			{/* Physical Hardware Section */}
			<Stack gap={2} width="100%">
				<SectionHeader
					title="Physical Hardware & Equipment"
					subtitle={`Book Value: ฿${formatMoney(totalBookValue)} • Dep: -฿${formatMoney(totalDepreciation)}/mo`}
				/>

				{gearAssets.length === 0 ? (
					<EmptyCard>No depreciating hardware assets recorded for this entity.</EmptyCard>
				) : (
					<Stack gap={2} width="100%">
						{gearAssets.map((hw) => {
							const dep = calculateAssetDepreciation(hw, selectedMonth);
							const pctRemaining = hw.cost > 0 ? (dep.remainingBookValue / hw.cost) * 100 : 0;

							return (
								<ItemRow
									key={hw.id}
									name={hw.name}
									imageUrl={hw.imageUrl}
									sub={`Bought ${hw.purchaseDate} • Cost: ฿${formatMoney(hw.cost)}`}
									details={
										<>
											<Stack className="my-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-ink/[0.08]">
												<Stack className="h-full rounded-pill bg-ink" style={{ width: `${pctRemaining}%` }} />
											</Stack>
											<Text className="text-[11px] text-slate">
												{dep.monthsRemaining} mos remaining • Depreciates -฿{formatMoney(dep.monthlyRate)}/mo
											</Text>
										</>
									}
									amount={`฿${formatMoney(dep.remainingBookValue)}`}
									caption="Book Value"
									onClick={() => onSelectHardware(hw)}
								/>
							);
						})}
					</Stack>
				)}
			</Stack>
		</Stack>
	);
};
