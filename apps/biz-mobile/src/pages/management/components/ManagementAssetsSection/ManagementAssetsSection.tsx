import React from "react";
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
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			{/* Liquid Cash Section */}
			<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
				<div className="section-header">
					<div>
						<span className="section-title">{t("section.liquidReserves", lang)}</span>
						<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
							Total Cash: ฿{formatMoney(totalLiquidReserves)} (Held at 100% value)
						</div>
					</div>
					<button
						type="button"
						className="action-pill-btn primary"
						style={{ padding: "4px 12px", fontSize: "12px" }}
						onClick={onAddAsset}
					>
						+ Add Asset
					</button>
				</div>

				{cashAssets.length === 0 ? (
					<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "16px" }}>
						No cash/reserve accounts tracked. Tap "+ Add Asset" to add cash reserves.
					</div>
				) : (
					<div className="item-list">
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
							return (
								<div
									key={hw.id}
									className="list-item-card"
									onClick={() => onSelectHardware(hw)}
								>
									<div className="item-thumb-wrapper">
										{hw.imageUrl ? (
											<img src={hw.imageUrl} alt={hw.name} className="item-thumb" />
										) : (
											<div className="item-thumb-fallback">฿</div>
										)}
									</div>
									<div className="item-info">
										<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
											<span className="item-name">{hw.name}</span>
											{assetBal.isDefault && (
												<span
													className="item-badge"
													style={{
														backgroundColor: "rgba(207, 69, 0, 0.08)",
														color: "var(--signal-orange)",
														fontSize: "10px",
														padding: "1px 6px",
													}}
												>
													DEFAULT
												</span>
											)}
										</div>
										<span className="item-sub">
											{assetBal.isDefault
												? `Base: ฿${formatMoney(assetBal.baseCost)}${
														assetBal.assetInjections !== 0
															? ` • Cap: ${assetBal.assetInjections >= 0 ? "+" : ""}฿${formatMoney(assetBal.assetInjections)}`
															: ""
													}${
														assetBal.netOperatingCash !== 0
															? ` • Net Flow: ${assetBal.netOperatingCash >= 0 ? "+" : ""}฿${formatMoney(assetBal.netOperatingCash)}`
															: ""
													}`
												: `Liquid Reserve${
														assetBal.assetInjections !== 0
															? ` • Injected: ฿${formatMoney(assetBal.assetInjections)}`
															: " (No Depreciation)"
													}`}
										</span>
									</div>
									<div className="item-amount-col">
										<span className={`item-amount ${assetBal.effectiveBalance >= 0 ? "positive" : "negative"}`}>
											฿{formatMoney(assetBal.effectiveBalance)}
										</span>
										<span
											className="item-badge"
											style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}
										>
											CASH
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Physical Hardware Section */}
			<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
				<div className="section-header">
					<div>
						<span className="section-title">Physical Hardware & Equipment</span>
						<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
							Book Value: ฿{formatMoney(totalBookValue)} • Dep: -฿{formatMoney(totalDepreciation)}/mo
						</div>
					</div>
				</div>

				{gearAssets.length === 0 ? (
					<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
						No depreciating hardware assets recorded for this entity.
					</div>
				) : (
					<div className="item-list">
						{gearAssets.map((hw) => {
							const dep = calculateAssetDepreciation(hw, selectedMonth);
							const pctRemaining = hw.cost > 0 ? (dep.remainingBookValue / hw.cost) * 100 : 0;

							return (
								<div
									key={hw.id}
									className="list-item-card"
									onClick={() => onSelectHardware(hw)}
								>
									<div className="item-thumb-wrapper">
										{hw.imageUrl ? (
											<img src={hw.imageUrl} alt={hw.name} className="item-thumb" />
										) : (
											<div className="item-thumb-fallback">
												{hw.name.slice(0, 2).toUpperCase()}
											</div>
										)}
									</div>
									<div className="item-info">
										<span className="item-name">{hw.name}</span>
										<span className="item-sub">
											Bought {hw.purchaseDate} • Cost: ฿{formatMoney(hw.cost)}
										</span>
										<div className="dep-progress-bar">
											<div className="dep-progress-fill" style={{ width: `${pctRemaining}%` }} />
										</div>
										<span style={{ fontSize: "11px", color: "var(--slate-gray)" }}>
											{dep.monthsRemaining} mos remaining • Depreciates -฿{formatMoney(dep.monthlyRate)}/mo
										</span>
									</div>
									<div className="item-amount-col">
										<span className="item-amount">฿{formatMoney(dep.remainingBookValue)}</span>
										<span style={{ fontSize: "11px", color: "var(--slate-gray)" }}>
											Book Value
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
