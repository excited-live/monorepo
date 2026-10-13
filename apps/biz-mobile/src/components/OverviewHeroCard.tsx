import React from "react";
import {
	calculateMonthlyEquivalent,
	calculateRunway,
	type EntityAccount,
	round2,
} from "@excited-live/biz";
import { HeroShell } from "./HeroShell";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

export const OverviewHeroCard: React.FC = () => {
	const { accounts, subscriptions, revenues } = useBiz();

	const entityBalance = (account: EntityAccount) => round2(account.cashReserve);
	const totalCash = round2(accounts.reduce((acc, a) => acc + a.cashReserve, 0));

	const entityBurn = (account: EntityAccount) =>
		round2(
			subscriptions
				.filter((s) => s.entityId === account.id && s.active)
				.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
		);

	const entityRevenue = (account: EntityAccount) =>
		round2(
			revenues
				.filter((r) => r.entityId === account.id && r.active)
				.reduce((acc, r) => acc + (r.frequency === "monthly" ? r.amount : 0), 0),
		);

	const totalBurn = round2(accounts.reduce((acc, a) => acc + entityBurn(a), 0));
	const totalRevenue = round2(accounts.reduce((acc, a) => acc + entityRevenue(a), 0));
	const netBurn = round2(totalBurn - totalRevenue);
	const runway = calculateRunway(totalCash, netBurn);

	return (
		<HeroShell>
			<div className="hero-eyebrow">All Entities · Overview</div>
			<div className="hero-balance">
				฿ {formatMoney(totalCash)}
			</div>
			<div className="hero-badge-row">
				<div className={`hero-status-pill ${netBurn <= 0 ? "alive" : "runway"}`}>
					{netBurn <= 0 ? "Default Alive (∞ Runway)" : `Runway: ${runway} Months`}
				</div>
			</div>

			<hr className="hero-divider" />
			{accounts.map((account) => (
				<div className="hero-meta-row" key={account.id}>
					<span className="hero-meta-label">{account.name}</span>
					{account.type === "fulltime_job" ? (
						<span className="hero-meta-value positive">
							+฿ {formatMoney(account.salary || 0)} / mo
						</span>
					) : (
						<span className="hero-meta-value">฿ {formatMoney(entityBalance(account))}</span>
					)}
				</div>
			))}
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Combined Net Burn</span>
				<span className="hero-meta-value">
					{netBurn > 0 ? "-" : "+"}฿ {formatMoney(Math.abs(netBurn))} / mo
				</span>
			</div>
		</HeroShell>
	);
};
