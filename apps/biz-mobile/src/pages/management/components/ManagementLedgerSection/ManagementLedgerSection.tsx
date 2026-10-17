import React from "react";
import type { LedgerActionItem } from "@excited-live/biz";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementLedgerSectionProps {
	monthActions: LedgerActionItem[];
	selectedMonth: string;
	lang?: MobileLocale;
}

export const ManagementLedgerSection: React.FC<ManagementLedgerSectionProps> = ({
	monthActions,
	selectedMonth,
	lang = "en",
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
			<div className="section-title">
				{t("ledger.actions", lang, {
					count: monthActions.length,
					month: selectedMonth,
				})}
			</div>

			{monthActions.length === 0 ? (
				<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
					{t("ledger.empty", lang)}
				</div>
			) : (
				<div className="item-list">
					{monthActions.map((action) => (
						<div key={action.id} className="list-item-card" style={{ cursor: "default" }}>
							<div className="item-thumb-wrapper">
								<div className="item-thumb-fallback">
									{action.type === "inflow"
										? "↓"
										: action.type === "outflow"
											? "↑"
											: "⚡"}
								</div>
							</div>
							<div className="item-info">
								<span className="item-name">{action.title}</span>
								<span className="item-sub">
									{action.date} • {action.category ? action.category.replace(/_/g, " ") : action.type}
								</span>
							</div>
							<div className="item-amount-col">
								<span
									className={`item-amount ${
										action.amount > 0 ? "positive" : "negative"
									}`}
								>
									{action.amount > 0 ? "+" : ""}฿
									{formatMoney(Math.abs(action.amount))}
								</span>
								<span
									className="item-badge"
									style={{
										backgroundColor:
											action.type === "inflow"
												? "rgba(10, 138, 77, 0.08)"
												: "rgba(207, 69, 0, 0.08)",
										color:
											action.type === "inflow"
												? "#0A8A4D"
												: "var(--signal-orange)",
									}}
								>
									{action.type.toUpperCase()}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
