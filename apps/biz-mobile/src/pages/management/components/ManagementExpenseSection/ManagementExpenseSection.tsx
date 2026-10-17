import React from "react";
import type { CapitalTransfer, RecurringSubscription } from "@excited-live/biz";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementExpenseSectionProps {
	isPersonal: boolean;
	entitySubs: RecurringSubscription[];
	outgoingTransfers: CapitalTransfer[];
	totalMonthlyExpenses: number;
	lang?: MobileLocale;
	onAddExpense?: () => void;
	onEditExpense?: (sub: RecurringSubscription) => void;
	onSelectTransfer?: (transfer: CapitalTransfer) => void;
}

export const ManagementExpenseSection: React.FC<ManagementExpenseSectionProps> = ({
	isPersonal,
	entitySubs,
	outgoingTransfers,
	totalMonthlyExpenses,
	lang = "en",
	onAddExpense = () => {},
	onEditExpense = () => {},
	onSelectTransfer = () => {},
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<div className="section-header">
				<div>
					<span className="section-title">
						Monthly Burn: ฿{formatMoney(totalMonthlyExpenses)}/mo
					</span>
					<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						{isPersonal
							? "Recurring expenses & capital deployed to businesses"
							: "Recurring operational commitments & services"}
					</div>
				</div>
				<div style={{ display: "flex", gap: "6px" }}>
					<button
						type="button"
						className="action-pill-btn primary"
						style={{ padding: "4px 12px", fontSize: "12px" }}
						onClick={onAddExpense}
					>
						{t("action.addExpense", lang)}
					</button>
				</div>
			</div>

			{entitySubs.length === 0 && (!isPersonal || outgoingTransfers.length === 0) ? (
				<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
					No expenses registered for this entity.
				</div>
			) : (
				<div className="item-list">
					{entitySubs.map((sub) => (
						<div
							key={sub.id}
							className="list-item-card"
							onClick={() => onEditExpense(sub)}
						>
							<div className="item-thumb-wrapper">
								{sub.imageUrl ? (
									<img src={sub.imageUrl} alt={sub.name} className="item-thumb" />
								) : (
									<div className="item-thumb-fallback">
										{sub.name.slice(0, 2).toUpperCase()}
									</div>
								)}
							</div>
							<div className="item-info">
								<span className="item-name">{sub.name}</span>
								<span className="item-sub">
									Billed {sub.cycle} • Due day {sub.nextRenewalDate?.slice(8) || "01"} • {sub.category}
								</span>
							</div>
							<div className="item-amount-col">
								<span className="item-amount negative">
									-฿{formatMoney(sub.amount)}
								</span>
								<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
									{sub.cycle.toUpperCase()}
								</span>
							</div>
						</div>
					))}

					{/* Outgoing Capital Transfers (treated as expenses for personal) */}
					{isPersonal &&
						outgoingTransfers.map((tItem) => (
							<div
								key={tItem.id}
								className="list-item-card"
								style={{ cursor: "pointer" }}
								onClick={() => onSelectTransfer(tItem)}
							>
								<div className="item-thumb-wrapper">
									<div className="item-thumb-fallback">CI</div>
								</div>
								<div className="item-info">
									<span className="item-name">{tItem.note || "Capital Deployed"}</span>
									<span className="item-sub">
										Seed to business • {tItem.date}
									</span>
								</div>
								<div className="item-amount-col">
									<span className="item-amount negative">
										-฿{formatMoney(tItem.amount)}
									</span>
									<span
										className="item-badge"
										style={{
											backgroundColor: "rgba(207, 69, 0, 0.08)",
											color: "var(--signal-orange)",
										}}
									>
										CAPITAL
									</span>
								</div>
							</div>
						))}
				</div>
			)}
		</div>
	);
};
