import React from "react";
import { generateMonthlyLedger } from "@excited-live/biz";
import { HeroCarousel } from "../components/HeroCarousel";
import { LedgerHeroCard } from "../components/LedgerHeroCard";
import { MonthStepper } from "../components/MonthStepper";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

export const LedgerView: React.FC = () => {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		transfers,
		activeEntityId,
		setActiveEntityId,
		selectedMonth,
	} = useBiz();

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;

	const ledger = generateMonthlyLedger({
		account: activeAccount,
		yearMonth: selectedMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
	});

	const { actions } = ledger;

	return (
		<div className="screen-content">
			{/* 1. Hero — monthly treasury summary per org */}
			<HeroCarousel
				accounts={accounts}
				activeEntityId={activeEntityId}
				onSelectEntity={setActiveEntityId}
				renderCard={(account) => (
					<LedgerHeroCard account={account} yearMonth={selectedMonth} />
				)}
			/>

			{/* 2. Month Control */}
			<MonthStepper />

			{/* 3. Detail — transactions */}
			<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
				<div className="section-header">
					<span className="section-title">Transactions & Charges</span>
					<span style={{ fontSize: "12px", color: "var(--slate-gray)" }}>{actions.length} events</span>
				</div>

				{actions.length === 0 ? (
					<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
						No charges or transactions logged for this month.
					</div>
				) : (
					<div className="item-list">
						{actions.map((act) => {
							const isPositive = act.amount >= 0;
							const isDepreciation = act.type === "depreciation";

							const matchSub = subscriptions.find((s) => s.id === act.reference);
							const matchHw = hardware.find((h) => h.id === act.reference);
							const matchRev = revenues.find((r) => r.id === act.reference);
							const itemImage = matchSub?.imageUrl || matchHw?.imageUrl || matchRev?.imageUrl;

							return (
								<div key={act.id} className="list-item-card">
									<div className="item-thumb-wrapper">
										{itemImage ? (
											<img src={itemImage} alt={act.title} className="item-thumb" />
										) : (
											<div className="item-thumb-fallback">
												{act.title.slice(0, 2).toUpperCase()}
											</div>
										)}
									</div>
									<div className="item-info">
										<span className="item-name">{act.title}</span>
										<span className="item-sub">
											{act.date} • {act.category || act.type.toUpperCase()}
										</span>
									</div>
									<div className="item-amount-col">
										<span
											className={`item-amount ${isPositive ? "positive" : isDepreciation ? "" : "negative"}`}
											style={{ color: isDepreciation ? "var(--slate-gray)" : undefined }}
										>
											{isPositive ? `+฿ ${formatMoney(act.amount)}` : `-฿ ${formatMoney(act.amount)}`}
										</span>
										{isDepreciation && (
											<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
												Non-Cash
											</span>
										)}
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
