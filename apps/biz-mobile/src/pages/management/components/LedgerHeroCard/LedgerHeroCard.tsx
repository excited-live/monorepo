import React from "react";
import { calculateMonthlyEquivalent, type EntityAccount } from "@excited-live/biz";
import { calculateProjectionBalances } from "../../../../domain/selectors";
import { useBiz } from "../../../../state";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import { HeroShell } from "../HeroShell";

export interface LedgerHeroCardProps {
	account: EntityAccount;
	yearMonth: string;
	onTap?: () => void;
}

const PAST_MONTHS = 6;
const FUTURE_MONTHS = 12;
const CHART_H = 110;
const CHART_WF_PLOT = 48;

export const LedgerHeroCard: React.FC<LedgerHeroCardProps> = ({
	account,
	yearMonth,
	onTap,
}) => {
	const { subscriptions, hardware, revenues, liabilities, transfers, lang } = useBiz();
	const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

	const {
		offsets,
		balances,
		totalIncome,
		totalExpense,
		projectedNet,
	} = calculateProjectionBalances({
		account,
		yearMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
		pastMonths: PAST_MONTHS,
		futureMonths: FUTURE_MONTHS,
	});

	// Granular expense breakdown by category/type for steady-state month
	const entitySubs = subscriptions.filter((s) => s.entityId === account.id && s.active);
	const outgoingTransfers = transfers.filter(
		(t) => t.fromEntityId === account.id && t.date.startsWith(yearMonth),
	);

	const expMap = new Map<string, number>();
	for (const s of entitySubs) {
		const rawCat = s.category || "Subscriptions";
		const catName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
		const cost = calculateMonthlyEquivalent(s.amount, s.cycle);
		expMap.set(catName, (expMap.get(catName) ?? 0) + cost);
	}
	for (const t of outgoingTransfers) {
		expMap.set("Capital", (expMap.get("Capital") ?? 0) + t.amount);
	}

	if (expMap.size === 0 && totalExpense > 0) {
		expMap.set("Expense", totalExpense);
	}

	const sortedCats = Array.from(expMap.entries()).sort((a, b) => b[1] - a[1]);
	let displayCats: Array<[string, number]> = [];
	if (sortedCats.length > 3) {
		displayCats = sortedCats.slice(0, 2);
		const otherSum = sortedCats.slice(2).reduce((sum, [, amt]) => sum + amt, 0);
		if (otherSum > 0) {
			displayCats.push(["Other", otherSum]);
		}
	} else {
		displayCats = sortedCats;
	}

	// Monthly cashflow waterfall: Income -> Granular Expenses -> Net
	const waterfall: Array<{ label: string; value: number; from: number; to: number; cls: string }> = [
		{ label: "Income", value: totalIncome, from: 0, to: totalIncome, cls: "wf-income" },
	];

	let currLevel = totalIncome;
	for (const [catLabel, catVal] of displayCats) {
		const nextLevel = currLevel - catVal;
		waterfall.push({
			label: catLabel,
			value: catVal,
			from: nextLevel,
			to: currLevel,
			cls: "wf-expense",
		});
		currLevel = nextLevel;
	}

	waterfall.push({
		label: "Net",
		value: projectedNet,
		from: 0,
		to: projectedNet,
		cls: projectedNet >= 0 ? "wf-net" : "wf-net negative",
	});

	const wfMin = Math.min(0, projectedNet);
	const wfMax = Math.max(totalIncome, 1);
	const wfK = (CHART_WF_PLOT - 0) / (wfMax - wfMin);
	const wfY = (v: number) => (v - wfMin) * wfK;
	const compact = (v: number) =>
		Math.abs(v) >= 1000 ? `฿${(v / 1000).toFixed(1)}k` : `฿${formatMoney(Math.abs(v))}`;

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
	const ym6 = y(balances.get(-6) ?? 0);
	const ym6Frac = (ym6 / CHART_H) * 100;
	const ym6Top = Math.abs(ym6 - nowY) <= 12 ? (ym6 < nowY ? nowYFrac - 12 : nowYFrac + 12) : ym6Frac;
	const y6 = y(balances.get(6) ?? 0);
	const y6Frac = (y6 / CHART_H) * 100;
	const y12 = y(balances.get(12) ?? 0);
	const y12Frac = (y12 / CHART_H) * 100;

	return (
		<HeroShell onClick={onTap}>
			<div className="hero-top-row">
				<div className="hero-eyebrow">Cashflow Projection</div>
				<span
					className="hero-flip-hint"
					style={{ cursor: "pointer" }}
					onPointerDown={stop}
					onClick={(e) => {
						e.stopPropagation();
						onTap?.();
					}}
				>
					{t("hero.tapToFlip", lang)}
				</span>
			</div>

			<div className="hero-chart">
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
				<span
					className="hero-chart-ylabel"
					style={{
						top: `${ym6Top}%`,
						color: "var(--hero-muted)",
						fontWeight: 600,
					}}
				>
					{compact(balances.get(-6) ?? 0)}
				</span>
				{Math.abs(y6 - nowY) > 14 && (
					<span
						className="hero-chart-ylabel"
						style={{
							top: `${y6Frac}%`,
							color: "var(--hero-muted)",
							fontWeight: 600,
						}}
					>
						{compact(balances.get(6) ?? 0)}
					</span>
				)}
				{Math.abs(y12 - y6) > 14 && Math.abs(y12 - nowY) > 14 && (
					<span
						className="hero-chart-ylabel"
						style={{
							top: `${y12Frac}%`,
							color: "var(--hero-muted)",
							fontWeight: 600,
						}}
					>
						{compact(balances.get(12) ?? 0)}
					</span>
				)}
				<svg viewBox={`0 0 ${W} ${CHART_H}`} preserveAspectRatio="none" aria-hidden="true">
					<line
						x1={0}
						x2={x(nowIndex)}
						y1={ym6}
						y2={ym6}
						stroke="var(--hero-muted)"
						strokeDasharray="2 3"
						strokeWidth={1}
						vectorEffect="non-scaling-stroke"
						opacity={0.6}
					/>
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
					<line
						x1={0}
						x2={x(nowIndex + 6)}
						y1={y6}
						y2={y6}
						stroke="var(--hero-muted)"
						strokeDasharray="2 3"
						strokeWidth={1}
						vectorEffect="non-scaling-stroke"
						opacity={0.6}
					/>
					<line
						x1={0}
						x2={x(nowIndex + 12)}
						y1={y12}
						y2={y12}
						stroke="var(--hero-muted)"
						strokeDasharray="2 3"
						strokeWidth={1}
						vectorEffect="non-scaling-stroke"
						opacity={0.4}
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
					<circle
						cx={x(0)}
						cy={ym6}
						r={3.5}
						fill="var(--hero-pill-bg, #fff)"
						stroke="var(--hero-muted)"
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
					/>
					<circle
						cx={x(nowIndex + 6)}
						cy={y(balances.get(6) ?? 0)}
						r={3.5}
						fill="var(--hero-pill-bg, #fff)"
						stroke="var(--hero-muted)"
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
					/>
					<circle
						cx={x(nowIndex + 12)}
						cy={y(balances.get(12) ?? 0)}
						r={3.5}
						fill="var(--hero-pill-bg, #fff)"
						stroke="var(--hero-muted)"
						strokeWidth={2}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>

				<div className="hero-chart-now-line" style={{ left: `${xFrac(nowIndex)}%` }} />
				<div
					className="hero-chart-now-dot"
					style={{ left: `${xFrac(nowIndex)}%`, top: `${nowYFrac}%` }}
				/>
				<span className="hero-chart-now-label" style={{ left: `${xFrac(nowIndex)}%` }}>
					Now
				</span>
			</div>

			{/* Timeline X-Axis Labels with In-Chart Projection Metrics */}
			<div className="hero-chart-labels">
				<span className="hero-chart-label" style={{ left: `${xFrac(0)}%` }}>
					-6M
				</span>
				<span className="hero-chart-label now" style={{ left: `${xFrac(nowIndex)}%`, transform: "translateX(-50%)" }}>
					Now
				</span>
				<span className="hero-chart-label" style={{ left: `${xFrac(nowIndex + 6)}%`, transform: "translateX(-50%)" }}>
					+6M
				</span>
				<span className="hero-chart-label" style={{ left: `${xFrac(nowIndex + 12)}%`, transform: "translateX(-100%)" }}>
					+12M
				</span>
			</div>

			{/* Granular Waterfall Breakdown */}
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
							<span className="wf-name" title={col.label}>{col.label}</span>
						</div>
					);
				})}
			</div>
		</HeroShell>
	);
};
