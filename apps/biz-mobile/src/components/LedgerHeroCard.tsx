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
}

const PAST_MONTHS = 6;
const FUTURE_MONTHS = 12;
const CHART_H = 110;

const monthShift = (ym: string, delta: number) => {
	const [y, m] = ym.split("-").map(Number);
	const zeroBased = (m ?? 1) - 1 + delta;
	const nextYear = (y ?? 0) + Math.floor(zeroBased / 12);
	const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
	return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};

const shortMonth = (ym: string) => {
	const [y, m] = ym.split("-").map(Number);
	return new Date(y ?? 0, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { month: "short" });
};

export const LedgerHeroCard: React.FC<LedgerHeroCardProps> = ({ account, yearMonth }) => {
	const { subscriptions, hardware, revenues, liabilities, transfers } = useBiz();

	const netOf = (ym: string) =>
		generateMonthlyLedger({
			account,
			yearMonth: ym,
			subscriptions,
			hardware,
			revenues,
			transfers,
		}).summary.netCashFlow;

	// Steady-state projection: recurring income - recurring expenses - liability payments
	const projectedNet = round2(
		revenues
			.filter((r) => r.entityId === account.id && r.active && r.frequency === "monthly")
			.reduce((acc, r) => acc + r.amount, 0) -
			subscriptions
				.filter((s) => s.entityId === account.id && s.active)
				.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) -
			liabilities
				.filter((l) => l.entityId === account.id && l.active)
				.reduce((acc, l) => acc + l.amount, 0),
	);

	const offsets: number[] = [];
	for (let m = -PAST_MONTHS; m <= FUTURE_MONTHS; m++) offsets.push(m);
	const monthYm = (offset: number) => monthShift(yearMonth, offset);

	// Balance at END of each month. Current-month point = today's actual cash.
	const balances = new Map<number, number>();
	balances.set(0, account.cashReserve);
	for (let m = -1; m >= -PAST_MONTHS; m--) {
		balances.set(m, round2((balances.get(m + 1) ?? 0) - netOf(monthYm(m + 1))));
	}
	for (let m = 1; m <= FUTURE_MONTHS; m++) {
		balances.set(m, round2((balances.get(m - 1) ?? 0) + projectedNet));
	}

	const values = offsets.map((m) => balances.get(m) ?? 0);
	const rawMin = Math.min(...values, 0);
	const rawMax = Math.max(...values);
	const span = rawMax - rawMin || 1;
	const min = rawMin - span * 0.1;
	const max = rawMax + span * 0.1;

	const W = 300;
	const x = (i: number) => (i / (offsets.length - 1)) * W;
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

	const zeroY = y(0);
	const nowY = y(balances.get(0) ?? 0);
	const nowYFrac = (nowY / CHART_H) * 100;

	const tickOffsets = offsets.filter((m) => m % 3 === 0);

	return (
		<HeroShell>
			<div className="hero-eyebrow">Runway Projection · {account.name}</div>

			<div className="hero-chart">
				<svg viewBox={`0 0 ${W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
					<line
						x1={0}
						x2={W}
						y1={zeroY}
						y2={zeroY}
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

				<div className="hero-chart-now-line" style={{ left: `${(nowIndex / (offsets.length - 1)) * 100}%` }} />
				<div
					className="hero-chart-now-dot"
					style={{ left: `${(nowIndex / (offsets.length - 1)) * 100}%`, top: `${nowYFrac}%` }}
				/>
				<span
					className="hero-chart-now-label"
					style={{ left: `${(nowIndex / (offsets.length - 1)) * 100}%` }}
				>
					Now
				</span>
			</div>

			<div className="hero-chart-labels">
				{tickOffsets.map((m) => {
					const idx = m + PAST_MONTHS;
					return (
						<span
							key={m}
							className={`hero-chart-label ${m === 0 ? "now" : ""}`}
							style={{
								left: `${(idx / (offsets.length - 1)) * 100}%`,
								transform: idx === 0 ? "none" : idx === offsets.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
							}}
						>
							{shortMonth(monthYm(m))}
						</span>
					);
				})}
			</div>

			<div className="hero-badge-row">
				<div className="hero-status-pill">
					{formatMoney(values[0] ?? 0)} → {formatMoney(values[values.length - 1] ?? 0)}
				</div>
				<div className={`hero-status-pill ${projectedNet >= 0 ? "alive" : "runway"}`}>
					{projectedNet >= 0 ? "+" : "-"}฿ {formatMoney(Math.abs(projectedNet))} / mo
				</div>
			</div>

			<hr className="hero-divider" />
			<div className="hero-meta-row">
				<span className="hero-meta-label">Treasury Today</span>
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
