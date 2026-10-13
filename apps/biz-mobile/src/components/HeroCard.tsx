import React from "react";
import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	calculateRunway,
	type EntityAccount,
	round2,
} from "@excited-live/biz";
import { HeroShell } from "./HeroShell";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

interface HeroCardProps {
	account: EntityAccount;
}

export const HeroCard: React.FC<HeroCardProps> = ({ account }) => {
	const { subscriptions, hardware, revenues, liabilities } = useBiz();

	const entitySubs = subscriptions.filter((s) => s.entityId === account.id && s.active);
	const entityHw = hardware.filter((h) => h.entityId === account.id);
	const entityRev = revenues.filter((r) => r.entityId === account.id && r.active);
	const entityLiab = liabilities.filter((l) => l.entityId === account.id && l.active);

	const recurringMonthly = round2(
		entitySubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
	);

	const depreciationMonthly = round2(
		entityHw.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").monthlyRate,
			0,
		),
	);

	const revenueMonthly = round2(
		entityRev.reduce(
			(acc, r) => acc + (r.frequency === "monthly" ? r.amount : 0),
			0,
		),
	);

	const liabilityMonthly = round2(
		entityLiab.reduce((acc, l) => acc + l.amount, 0),
	);

	const runRate = round2(revenueMonthly - recurringMonthly - liabilityMonthly);
	const netBurn = round2(recurringMonthly + liabilityMonthly - revenueMonthly);
	const runway = calculateRunway(account.cashReserve, netBurn);

	return (
		<HeroShell account={account} variant="register">
			{account.type === "personal" && (
				<>
					<div className="hero-eyebrow">Personal Cash Reserve</div>
					<div className="hero-balance">
						฿ {formatMoney(account.cashReserve, 2)}
					</div>
					<div className="hero-badge-row">
						<div className="hero-status-pill runway">
							Runway: {runway ?? "∞"} Months
						</div>
					</div>

					<hr className="hero-divider" />
					<div className="hero-meta-row">
						<span className="hero-meta-label">Planned Monthly Burn</span>
						<span className="hero-meta-value">฿ {formatMoney(recurringMonthly)} / mo</span>
					</div>
					<div className="hero-meta-row secondary">
						<span className="hero-meta-label">Subscriptions & Living</span>
						<span className="hero-meta-value">฿ {formatMoney(recurringMonthly)}</span>
					</div>
					<div className="hero-meta-row secondary">
						<span className="hero-meta-label">Hardware Depreciation</span>
						<span className="hero-meta-value">฿ {formatMoney(depreciationMonthly)}</span>
					</div>
				</>
			)}

			{account.type === "fulltime_job" && (
				<>
					<div className="hero-eyebrow">Consultant Base Salary</div>
					<div className="hero-balance">
						฿ {formatMoney(account.salary || 75000, 2)} / mo
					</div>
					<div className="hero-badge-row">
						<div className="hero-status-pill alive">
							Until Payday: 14 Days
						</div>
					</div>

					<hr className="hero-divider" />
					<div className="hero-meta-row">
						<span className="hero-meta-label">Next Expected Deposit</span>
						<span className="hero-meta-value">Oct 28 • +฿75,000.00</span>
					</div>
					<div className="hero-meta-row">
						<span className="hero-meta-label">Target Solopreneur Buffer</span>
						<span className="hero-meta-value">6 Months (฿150,000 goal)</span>
					</div>
				</>
			)}

			{account.type === "business" && (
				<>
					<div className="hero-eyebrow">{account.name} Treasury</div>
					<div className="hero-balance">
						฿ {formatMoney(account.cashReserve, 2)}
					</div>
					<div className="hero-badge-row">
						<div className={`hero-status-pill ${netBurn <= 0 ? "alive" : "runway"}`}>
							{netBurn <= 0 ? "Default Alive (∞ Runway)" : `Runway: ${runway} Months`}
						</div>
						<span className="item-badge hero-venture-badge">Venture</span>
					</div>

					<hr className="hero-divider" />
					<div className="hero-meta-row">
						<span className="hero-meta-label">Run Rate</span>
						<span className={`hero-meta-value ${runRate >= 0 ? "positive" : "negative"}`}>
							{runRate >= 0 ? "+" : "-"}฿ {formatMoney(Math.abs(runRate))} / mo
						</span>
					</div>
					<div className="hero-meta-row secondary">
						<span className="hero-meta-label">Revenue (MRR)</span>
						<span className="hero-meta-value positive">+฿ {formatMoney(revenueMonthly)}</span>
					</div>
					<div className="hero-meta-row secondary">
						<span className="hero-meta-label">Cash Outflows</span>
						<span className="hero-meta-value">-฿ {formatMoney(recurringMonthly + liabilityMonthly)}</span>
					</div>
					{liabilityMonthly > 0 && (
						<div className="hero-meta-row secondary">
							<span className="hero-meta-label">Liability Payments</span>
							<span className="hero-meta-value">-฿ {formatMoney(liabilityMonthly)}</span>
						</div>
					)}
				</>
			)}
		</HeroShell>
	);
};
