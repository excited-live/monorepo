import { ProjectionChart } from "./ProjectionChart"
import { TestScaffold } from "../../../testing/TestScaffold"
import type { MonteCarloBand, SimulationYear } from "../../../lib/plan-service"

/**
 * Deterministic 30-year projection series. Shapes mirror SimulationYear's
 * consumed fields (netWorth, netCash, year, unmet) — the chart reads only
 * these plus optional milestone markers.
 */
const START_YEAR = 2026

const YEARS: SimulationYear[] = Array.from({ length: 30 }, (_, i) => {
	const year = START_YEAR + i
	const netWorth = 420_000 + i * 950_000 - (i > 25 ? (i - 25) * 1_800_000 : 0)
	return {
		year,
		age: 30 + i,
		income: 1_400_000 + i * 30_000,
		expenses: 700_000 + i * 18_000,
		tax: 120_000 + i * 2_400,
		netCash: 580_000 - i * 12_000,
		contribution: 520_000 - i * 10_000,
		withdrawal: i > 25 ? 1_200_000 : 0,
		wallets: {
			emergency: 120_000,
			goal: 50_000 + i * 40_000,
			nontax: netWorth - 170_000 - i * 40_000,
			taxAdvantaged: i * 10_000,
		},
		netWorth,
		unmet: false,
	} as SimulationYear
})

const BANDS: MonteCarloBand[] = YEARS.map((y) => ({
	p10: y.netWorth * 0.55,
	p50: y.netWorth,
	p90: y.netWorth * 1.5,
}))

const MILESTONES = [
	{ id: "milestone-house", label: "Buy house", year: 2027, month: 0 },
	{ id: "milestone-retire", label: "Retire", year: 2055, month: 0 },
]

export const NetWorth = () => (
	<TestScaffold locale="en" initialPath="/">
		<ProjectionChart
			years={YEARS}
			metric="netWorth"
			ariaLabel="Net worth projection chart"
			band={BANDS}
			milestones={MILESTONES}
		/>
	</TestScaffold>
)

export const CashFlow = () => (
	<TestScaffold locale="en" initialPath="/">
		<ProjectionChart
			years={YEARS}
			metric="cashFlow"
			ariaLabel="Cash flow projection chart"
		/>
	</TestScaffold>
)
