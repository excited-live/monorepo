import React from "react";
import {
	calculateMonthlyEquivalent,
	generateMonthlyLedger,
	round2,
	type EntityAccount,
} from "@excited-live/biz";
import { HeroShell } from "./HeroShell";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

interface LedgerHeroCardProps {
	account: EntityAccount;
	yearMonth: string;
	onTap?: () => void;
}

const PAST_MONTHS = 6;
const FUTURE_MONTHS = 12;
const CHART_H = 110;
const CHART_WF_PLOT = 48;

const monthShift = (ym: string, delta: number) => {
	const [y, m] = ym.split("-").map(Number);
	const zeroBased = (m ?? 1) - 1 + delta;
	const nextYear = (y ?? 0) + Math.floor(zeroBased / 12);
	const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
	return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};

export const LedgerHeroCard: React.FC<LedgerHeroCardProps> = ({ account, yearMonth, onTap }) => {
	const { subscriptions, hardware, revenues, liabilities, transfers } = useBiz();

	const netOf = (ym: string, acc: EntityAccount = account) =>
		generateMonthlyLedger({
			account: acc,
			yearMonth: ym,
			subscriptions,
			hardware,
			revenues,
			transfers,
			liabilities,
		}).summary.netCashFlow;

	// Steady-state projection: career income + recurring income - recurring expenses - liability payments
	const entityRevenues = revenues.filter((r) => r.entityId === account.id && r.active);
	const hasSalaryStream = entityRevenues.some((r) => r.source === "salary");
	const legacySalary = !hasSalaryStream && account.type === "personal" ? (account.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
		entityRevenues
			.filter((r) => r.frequency === "monthly")
			.reduce((acc, r) => acc + r.amount, 0),
	);
	const totalExpense = round2(
		subscriptions
			.filter((s) => s.entityId === account.id && s.active)
			.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
	);
	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && l.active)
			.reduce((acc, l) => acc + l.amount, 0),
	);
	const projectedNet = round2(totalIncome - totalExpense - liabilityMonthly);

	// Monthly cashflow waterfall (projected steady-state month)
	const waterfall = [
		{ label: "Income", value: totalIncome, from: 0, to: totalIncome, cls: "wf-income" },
		{
			label: "Expense",
			value: totalExpense,
			from: totalIncome - totalExpense,
			to: totalIncome,
			cls: "wf-expense",
		},
		{
			label: "Liability",
			value: liabilityMonthly,
			from: projectedNet,
			to: totalIncome - totalExpense,
			cls: "wf-liability",
		},
		{ label: "Net", value: projectedNet, from: 0, to: projectedNet, cls: "wf-net" },
	];
	const wfMin = Math.min(0, projectedNet);
	const wfMax = Math.max(totalIncome, 1);
	const wfK = (CHART_WF_PLOT - 0) / (wfMax - wfMin);
	const wfY = (v: number) => (v - wfMin) * wfK;
	const compact = (v: number) =>
		Math.abs(v) >= 1000 ? `฿${(v / 1000).toFixed(1)}k` : `฿${formatMoney(Math.abs(v))}`;

	const offsets: number[] = [];
	for (let m = -PAST_MONTHS; m <= FUTURE_MONTHS; m++) offsets.push(m);
	const monthYm = (offset: number) => monthShift(yearMonth, offset);

	// Balance at END of each month. Current-month point = today's actual cash.
	const balances = new Map<number, number>();
	balances.set(0, account.cashReserve);
	for (let m = -1; m >= -PAST_MONTHS; m--) {
		// Walk back without career income: career accounting starts this month
		balances.set(
			m,
			round2((balances.get(m + 1) ?? 0) - netOf(monthYm(m + 1), { ...account, salary: undefined })),
		);
	}
	for (let m = 1; m <= FUTURE_MONTHS; m++) {
		const ym = monthYm(m);
		const ledgerNet = netOf(ym, account);
		balances.set(m, round2((balances.get(m - 1) ?? 0) + ledgerNet));
	}

	const values = offsets.map((m) => balances.get(m) ?? 0);
	const rawMin = Math.min(...values);
	const rawMax = Math.max(...values);
	const span = rawMax - rawMin || 1;
	const min = rawMin - span * 0.1;
	const max = rawMax + span * 0.1;

	const W = 300;
	const PLOT_LEFT = 44;
	const x = (i: number) => PLOT_LEFT + (i / (offsets.length - 1)) * (W - PLOT_LEFT - 4);
	const xFrac = (i: number) => (x(i) / W) * 100;
	const y = (value: number) => 8 + (1 - (value - min) / (max - min)) * (CHART_H - 16);

	const nowIndex = PAST_MONTHS;
	const pastPath = offsets
		.slice(0, nowIndex + 1)
		.map((m, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(balances.get(m) ?? 0).toFixed(2)}`)
		.join(" ");
	const futurePath = offsets
		.slice(nowIndex)
		.map((m, i) => `${i === 0 ? "M" : "L"}${x(nowIndex + i).toFixed(2)},${y(balances.get(m) ?? 0).toFixed(2)}`)
		.join(" ");

	const nowY = y(balances.get(0) ?? 0);
	const nowYFrac = (nowY / CHART_H) * 100;

	return (
		<HeroShell onClick={onTap}>
			<div className="hero-top-row">
				<div className="hero-eyebrow">Cashflow Projection</div>
				<span
					className="hero-flip-hint"
					style={{ cursor: "pointer" }}
					onClick={(e) => {
						e.stopPropagation();
						onTap?.();
					}}
				>
					Tap to flip
				</span>
			</div>

			<div className="hero-chart">
				{/* Current Value label on Y-axis aligned with the reference line passing through the Now dot */}
				<span
					className="hero-chart-ylabel hero-chart-now-ylabel"
					style={{
						top: `${nowYFrac}%`,
						fontWeight: 700,
						color: "var(--ink-black)",
					}}
				>
					{compact(balances.get(0) ?? 0)}
				</span>
				{Math.abs(y(rawMax) - nowY) > 18 && (
					<span className="hero-chart-ylabel" style={{ top: `${(y(rawMax) / CHART_H) * 100}%` }}>
						{compact(rawMax)}
					</span>
				)}
				{Math.abs(y(rawMin) - nowY) > 18 && (
					<span className="hero-chart-ylabel" style={{ top: `${(y(rawMin) / CHART_H) * 100}%` }}>
						{compact(rawMin)}
					</span>
				)}
				<svg viewBox={`0 0 ${W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
					{/* Reference line passing through the current value dot */}
					<line
						x1={0}
						x2={W}
						y1={nowY}
						y2={nowY}
						stroke="var(--hero-muted)"
						strokeDasharray="3 4"
						strokeWidth={1}
						vectorEffect="non-scaling-stroke"
						opacity={0.5}
					/>
					<path
						d={futurePath}
						fill="none"
						stroke="var(--hero-muted)"
						strokeWidth={2}
						strokeDasharray="5 5"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={pastPath}
						fill="none"
						stroke="var(--hero-text)"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				<div className="hero-chart-now-line" style={{ left: `${xFrac(nowIndex)}%` }} />
				<div
					className="hero-chart-now-dot"
					style={{ left: `${xFrac(nowIndex)}%`, top: `${nowYFrac}%` }}
				/>
				<span
					className="hero-chart-now-label"
					style={{ left: `${xFrac(nowIndex)}%` }}
				>
					Now
				</span>
			</div>

			<div className="hero-waterfall">
				{waterfall.map((col) => {
					const bottom = Math.min(wfY(col.from), wfY(col.to));
					const height = col.value === 0 ? 0 : Math.max(2, Math.abs(wfY(col.to) - wfY(col.from)));
					return (
						<div className="wf-col" key={col.label}>
							<span className="wf-value">{compact(col.value)}</span>
							<div className="wf-plot">
								<div
									className={`wf-bar ${col.cls}`}
									style={{ bottom: `${bottom}px`, height: `${height}px` }}
								/>
							</div>
							<span className="wf-name">{col.label}</span>
						</div>
					);
				})}
			</div>

			<hr className="hero-divider" />
			<div className="hero-meta-row">
				<span className="hero-meta-label">Total Cashflow Today</span>
				<span className="hero-meta-value">฿ {formatMoney(account.cashReserve)}</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Projected in 6 Months</span>
				<span className="hero-meta-value">
					฿ {formatMoney(balances.get(6) ?? 0)}
				</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Projected in 12 Months</span>
				<span className="hero-meta-value">
					฿ {formatMoney(balances.get(12) ?? 0)}
				</span>
			</div>
		</HeroShell>
	);
};
