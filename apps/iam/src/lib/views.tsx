import type { ReactNode } from "react"
import { formatMonth, formatPercent, formatRelative, formatThb } from "../lib/format"

/**
 * The "rendered component" half of the Data tab.
 *
 * A view exists only where the API's real response shape supports one; anything
 * else falls back to the raw JSON deck rather than showing a fabricated chart.
 * Shapes below are taken from apps/api (Summary, MonthlyLedger, Projection,
 * UserOnboarding, agent keys), not invented.
 */

type Json = unknown

function record(value: Json): Record<string, Json> {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json>) : {}
}

function list(value: Json): Json[] {
	return Array.isArray(value) ? value : []
}

function num(value: Json): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null
}

function text(value: Json): string | null {
	return typeof value === "string" ? value : null
}

function Metric({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
	return (
		<div className="metric">
			<span>{label}</span>
			<strong>{value}</strong>
			{hint ? <span className="tiny" style={{ textTransform: "none", letterSpacing: 0 }}>{hint}</span> : null}
		</div>
	)
}

function WealthView({ data }: { data: Json }) {
	const root = record(data)
	const entities = list(root.entities)
	const totals = entities.reduce<{
		assets: number
		wealth: number
		liability: number
		cash: number
		gear: number
	}>(
		(acc, entry) => {
			const metrics = record(record(entry).metrics)
			return {
				assets: acc.assets + (num(metrics.totalAssetsValue) ?? 0),
				wealth: acc.wealth + (num(metrics.currentWealth) ?? 0),
				liability: acc.liability + (num(metrics.liabilityMonthly) ?? 0),
				cash: acc.cash + (num(metrics.cashAssetsValue) ?? 0),
				gear: acc.gear + (num(metrics.gearAssetsValue) ?? 0),
			}
		},
		{ assets: 0, wealth: 0, liability: 0, cash: 0, gear: 0 },
	)
	const share = totals.assets > 0 ? totals.cash / totals.assets : null

	return (
		<div className="view">
			<div className="row spread">
				<div>
					<span className="view-sub">{formatMonth(text(root.yearMonth))} · {entities.length} {entities.length === 1 ? "entity" : "entities"}</span>
					<div className="view-hero">{formatThb(totals.wealth)}</div>
					<span className="view-sub">current net wealth across entities</span>
				</div>
				<span className="badge ok">computed</span>
			</div>
			<div className="metric-row">
				<Metric label="Total assets" value={formatThb(totals.assets)} />
				<Metric label="Monthly debt" value={formatThb(totals.liability)} />
				<Metric label="Cash share" value={formatPercent(share)} />
			</div>
			{share !== null ? (
				<>
					<div className="meter" role="img" aria-label={`Cash ${formatPercent(share)} of assets, investments ${formatPercent(1 - share)}`}>
						<span style={{ width: `${share * 100}%`, background: "var(--iam-orange)" }} />
						<span style={{ width: `${(1 - share) * 100}%`, background: "var(--iam-ink)", opacity: 0.25 }} />
					</div>
					<div className="legend">
						<span><i style={{ background: "var(--iam-orange)" }} />Cash {formatThb(totals.cash)}</span>
						<span><i style={{ background: "var(--iam-ink)", opacity: 0.4 }} />Invested {formatThb(totals.gear)}</span>
					</div>
				</>
			) : null}
			{entities.length > 1 ? (
				<div className="table-scroll">
					<table className="data">
						<thead>
							<tr><th>Entity</th><th>Wealth</th><th>Income</th><th>Expense</th><th>Runway</th></tr>
						</thead>
						<tbody>
							{entities.map((entry, index) => {
								const row = record(entry)
								const metrics = record(row.metrics)
								return (
									<tr key={text(row.entityId) ?? index}>
										<td>{text(row.entityId) ?? `entity ${index + 1}`}</td>
										<td>{formatThb(num(metrics.currentWealth))}</td>
										<td>{formatThb(num(metrics.totalIncome))}</td>
										<td>{formatThb(num(metrics.totalExpense))}</td>
										<td>{num(metrics.runwayMonths) === null ? "—" : `${num(metrics.runwayMonths)} mo`}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	)
}

function LedgerView({ data }: { data: Json }) {
	const root = record(data)
	const summary = record(root.summary)
	const items = list(root.actionItems).slice(0, 6)

	return (
		<div className="view">
			<div className="row spread">
				<div>
					<span className="view-sub">Computed ledger · {formatMonth(text(root.yearMonth) ?? text(summary.yearMonth))}</span>
					<div className="view-hero">{formatThb(num(summary.netCashFlow))}</div>
					<span className="view-sub">net cash flow this month</span>
				</div>
				{summary.isDefaultAlive === false ? <span className="badge warn">burning runway</span> : null}
			</div>
			<div className="metric-row">
				<Metric label="Opened" value={formatThb(num(summary.startingTreasury))} />
				<Metric label="Closed" value={formatThb(num(summary.endingTreasury))} />
				<Metric label="Runway" value={num(summary.runwayMonths) === null ? "—" : `${num(summary.runwayMonths)} mo`} />
			</div>
			<div className="grid-2" style={{ gap: 12 }}>
				<Metric label="Inflow" value={formatThb(num(summary.totalInflow))} />
				<Metric label="Outflow" value={formatThb(num(summary.totalCashOutflow))} />
			</div>
			{items.length > 0 ? (
				<div className="table-scroll">
					<table className="data">
						<thead>
							<tr><th>Action</th><th>Date</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th></tr>
						</thead>
						<tbody>
							{items.map((entry, index) => {
								const row = record(entry)
								return (
									<tr key={text(row.id) ?? index}>
										<td>{text(row.title) ?? "—"}</td>
										<td>{text(row.date) ?? "—"}</td>
										<td><span className="badge">{text(row.type) ?? "—"}</span></td>
										<td style={{ textAlign: "right" }}>{formatThb(num(row.amount))}</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	)
}

function ProjectionView({ data }: { data: Json }) {
	const root = record(data)
	const points = list(root.points)
	const balances = points.map((point) => num(record(point).balance) ?? 0)
	const max = Math.max(...balances.map((value) => Math.abs(value)), 1)
	const shown = points.slice(0, 12)

	return (
		<div className="view">
			<div className="row spread">
				<div>
					<span className="view-sub">Treasury projection · {shown.length} of {points.length} months</span>
					<div className="view-hero">{formatThb(num(root.projectedNet))}</div>
					<span className="view-sub">projected net position</span>
				</div>
			</div>
			<div className="metric-row">
				<Metric label="Total income" value={formatThb(num(root.totalIncome))} />
				<Metric label="Total expense" value={formatThb(num(root.totalExpense))} />
				<Metric label="Debt / month" value={formatThb(num(root.liabilityMonthly))} />
			</div>
			<div className="bars">
				{shown.map((point, index) => {
					const row = record(point)
					const balance = num(row.balance) ?? 0
					return (
						<div className="bar-row" key={text(row.yearMonth) ?? index}>
							<span className="tiny muted">{formatMonth(text(row.yearMonth))}</span>
							<span className="bar-track">
								<span style={{ width: `${Math.max(2, (Math.abs(balance) / max) * 100)}%`, opacity: balance < 0 ? 0.45 : 1 }} />
							</span>
							<span className="tiny">{formatThb(balance)}</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function OnboardingView({ data }: { data: Json }) {
	const root = record(data)
	const done = list(root.done).map(text).filter((value): value is string => Boolean(value))
	const skipped = list(root.skipped).map(text).filter((value): value is string => Boolean(value))

	return (
		<div className="view">
			<div className="row spread">
				<div>
					<span className="view-sub">Onboarding state{text(root.appId) ? ` · ${text(root.appId)}` : ""}</span>
					<div className="view-hero">{root.isCompleted ? "Complete" : "In progress"}</div>
					<span className="view-sub">
						{done.length} done · {skipped.length} skipped · {text(root.method) ?? "no method chosen"}
					</span>
				</div>
				<span className={`badge ${root.isCompleted ? "ok" : "warn"}`}>{root.isCompleted ? "done" : "open"}</span>
			</div>
			{(done.length > 0 || skipped.length > 0) ? (
				<div className="stack" style={{ gap: 6 }}>
					{done.map((step) => (
						<div key={`done-${step}`} className="row" style={{ gap: 8 }}>
							<span className="badge ok">✓</span><span className="small">{step}</span>
						</div>
					))}
					{skipped.map((step) => (
						<div key={`skip-${step}`} className="row" style={{ gap: 8 }}>
							<span className="badge">–</span><span className="small muted">{step}</span>
						</div>
					))}
				</div>
			) : (
				<p className="small muted" style={{ margin: 0 }}>No step has been completed yet.</p>
			)}
		</div>
	)
}

function KeysView({ data }: { data: Json }) {
	const keys = list(record(data).keys ?? data)
	return (
		<div className="view">
			<span className="view-sub">{keys.length} agent key{keys.length === 1 ? "" : "s"}</span>
			<div className="table-scroll">
				<table className="data">
					<thead>
						<tr><th>Agent</th><th>Key</th><th>Last used</th><th>Expires</th></tr>
					</thead>
					<tbody>
						{keys.map((entry, index) => {
							const row = record(entry)
							return (
								<tr key={text(row.id) ?? index}>
									<td>{text(row.agentId) ?? text(row.name) ?? "—"}</td>
									<td className="mono">{text(row.start) ? `${text(row.start)}…` : "—"}</td>
									<td>{formatRelative(text(row.lastRequest))}</td>
									<td>{formatRelative(text(row.expiresAt))}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

/** Records (entities, expenses, incomes…) share a name + amount shape. */
function RecordsView({ data, label }: { data: Json; label: string }) {
	const rows = Array.isArray(data) ? data : list(record(data).items)
	const objects = rows.slice(0, 8).map(record)
	const columns = [...new Set(objects.flatMap((row) => Object.keys(row)))].slice(0, 5)

	if (objects.length === 0) {
		return (
			<div className="view">
				<span className="view-sub">{label}</span>
				<p className="small muted" style={{ margin: 0 }}>The API returned an empty list.</p>
			</div>
		)
	}

	return (
		<div className="view">
			<span className="view-sub">{rows.length} {label.toLowerCase()}</span>
			<div className="table-scroll">
				<table className="data">
					<thead>
						<tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
					</thead>
					<tbody>
						{objects.map((row, index) => (
							<tr key={text(row.id) ?? index}>
								{columns.map((column) => {
									const value = row[column]
									return (
										<td key={column}>
											{typeof value === "number" ? formatThb(value) : typeof value === "string" ? value : value === null || value === undefined ? "—" : JSON.stringify(value)}
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

/**
 * Endpoint id → view. Ids come from the generated catalog, so a renamed route
 * simply loses its custom view and shows raw JSON instead of breaking.
 */
export function endpointView(endpointId: string, data: Json): ReactNode | null {
	switch (endpointId) {
		case "get-api-v1-accounting-summary":
			return <WealthView data={data} />
		case "get-api-v1-accounting-ledger-yearMonth":
			return <LedgerView data={data} />
		case "get-api-v1-accounting-projection":
			return <ProjectionView data={data} />
		case "get-api-v1-onboarding":
		case "put-api-v1-onboarding":
			return <OnboardingView data={data} />
		case "get-api-v1-agent-keys":
			return <KeysView data={data} />
		case "get-api-v1-accounting-entities":
			return <RecordsView data={data} label="Entities" />
		case "get-api-v1-accounting-expenses":
			return <RecordsView data={data} label="Expenses" />
		case "get-api-v1-accounting-incomes":
			return <RecordsView data={data} label="Incomes" />
		case "get-api-v1-accounting-assets":
			return <RecordsView data={data} label="Assets" />
		case "get-api-v1-accounting-liabilities":
			return <RecordsView data={data} label="Liabilities" />
		case "get-api-v1-accounting-transfers":
			return <RecordsView data={data} label="Transfers" />
		default:
			return null
	}
}
