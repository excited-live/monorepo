import React from "react";
import type { EntityAccount, RevenueStream } from "@excited-live/biz";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementIncomeSectionProps {
	isPersonal: boolean;
	activeAccount: EntityAccount;
	entityRev: RevenueStream[];
	totalIncome: number;
	hasConfiguredSalary: boolean;
	lang?: MobileLocale;
	onInjectCapital?: () => void;
	onAddIncome?: () => void;
	onEditIncome?: (rev: RevenueStream) => void;
}

export const ManagementIncomeSection: React.FC<ManagementIncomeSectionProps> = ({
	isPersonal,
	activeAccount,
	entityRev,
	totalIncome,
	hasConfiguredSalary,
	lang = "en",
	onInjectCapital = () => {},
	onAddIncome = () => {},
	onEditIncome = () => {},
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<div className="section-header">
				<div>
					<span className="section-title">
						{isPersonal
							? `Monthly Income: ฿${formatMoney(totalIncome)}/mo`
							: `Total MRR: ฿${formatMoney(totalIncome)}/mo`}
					</span>
					<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						{isPersonal
							? "Base salary and operational income"
							: "Monthly recurring revenues and subscriptions"}
					</div>
				</div>
				<div style={{ display: "flex", gap: "8px" }}>
					{!isPersonal && (
						<button
							type="button"
							className="action-pill-btn"
							style={{ padding: "4px 12px", fontSize: "12px" }}
							onClick={onInjectCapital}
						>
							{t("action.injectCapital", lang)}
						</button>
					)}
					<button
						type="button"
						className="action-pill-btn primary"
						style={{ padding: "4px 12px", fontSize: "12px" }}
						onClick={onAddIncome}
					>
						{t("action.addIncome", lang)}
					</button>
				</div>
			</div>

			{/* Base Salary Card (Personal Mode only, if set) */}
			{isPersonal && activeAccount.salary && !hasConfiguredSalary && (
				<div className="list-item-card">
					<div className="item-thumb-wrapper">
						<div className="item-thumb-fallback">💼</div>
					</div>
					<div className="item-info">
						<span className="item-name">Primary Career Income</span>
						<span className="item-sub">
							Payday Day {activeAccount.paydayDayOfMonth ?? 28} • Net Monthly
						</span>
					</div>
					<div className="item-amount-col">
						<span className="item-amount positive">
							+฿{formatMoney(activeAccount.salary)}
						</span>
						<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
							SALARY
						</span>
					</div>
				</div>
			)}

			{entityRev.length === 0 && (!isPersonal || !activeAccount.salary) ? (
				<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
					No income streams registered for this entity.
				</div>
			) : (
				<div className="item-list">
					{entityRev.map((rev) => (
						<div
							key={rev.id}
							className="list-item-card"
							onClick={() => onEditIncome(rev)}
						>
							<div className="item-thumb-wrapper">
								{rev.imageUrl ? (
									<img src={rev.imageUrl} alt={rev.name} className="item-thumb" />
								) : (
									<div className="item-thumb-fallback">
										{rev.name.slice(0, 2).toUpperCase()}
									</div>
								)}
							</div>
							<div className="item-info">
								<span className="item-name">{rev.name}</span>
								<span className="item-sub">
									{rev.source.replace(/_/g, " ")} • {rev.frequency}
								</span>
							</div>
							<div className="item-amount-col">
								<span className="item-amount positive">
									+฿{formatMoney(rev.amount)}
								</span>
								<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
									{rev.source === "salary" ? "SALARY" : "MONTHLY"}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
