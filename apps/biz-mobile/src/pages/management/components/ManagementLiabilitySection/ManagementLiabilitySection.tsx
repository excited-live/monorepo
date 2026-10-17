import React from "react";
import type { LiabilityStream } from "@excited-live/biz";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementLiabilitySectionProps {
	entityLiab: LiabilityStream[];
	totalMonthlyLiabilities: number;
	lang?: MobileLocale;
	onRegisterLiability?: () => void;
	onSelectLiability?: (liab: LiabilityStream) => void;
}

export const ManagementLiabilitySection: React.FC<ManagementLiabilitySectionProps> = ({
	entityLiab,
	totalMonthlyLiabilities,
	lang = "en",
	onRegisterLiability = () => {},
	onSelectLiability = () => {},
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<div className="section-header">
				<div>
					<span className="section-title">Liabilities & Debt Payments</span>
					<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						Total Monthly Payments: ฿{formatMoney(totalMonthlyLiabilities)}/mo
					</div>
				</div>
				<button
					type="button"
					className="action-pill-btn primary"
					style={{ padding: "4px 12px", fontSize: "12px" }}
					onClick={onRegisterLiability}
				>
					{t("action.registerLiability", lang)}
				</button>
			</div>

			{entityLiab.length === 0 ? (
				<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
					No liabilities registered for this entity.
				</div>
			) : (
				<div className="item-list">
					{entityLiab.map((liab) => (
						<div
							key={liab.id}
							className="list-item-card"
							onClick={() => onSelectLiability(liab)}
						>
							<div className="item-thumb-wrapper">
								{liab.imageUrl ? (
									<img src={liab.imageUrl} alt={liab.name} className="item-thumb" />
								) : (
									<div className="item-thumb-fallback">💳</div>
								)}
							</div>
							<div className="item-info">
								<span className="item-name">{liab.name}</span>
								<span className="item-sub">
									Debt Payment • {liab.category.replace(/_/g, " ")}
								</span>
							</div>
							<div className="item-amount-col">
								<span className="item-amount negative">
									-฿{formatMoney(liab.amount)}
								</span>
								<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
									DEBT
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
