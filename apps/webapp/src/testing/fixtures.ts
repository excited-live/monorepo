/**
 * Shared visual-test fixtures. Deterministic by design: every year/month is
 * hard-coded (FIXTURE_START_YEAR), so stories render identically on any day
 * and on any machine. Plausible Thai financial-simulation data consistent
 * with what the plan components consume (same shape as defaultPlanInput).
 */
import type {
	AssetRow,
	LiabilityRow,
	MilestoneRow,
	PeriodRow,
	PlanInput,
} from "../lib/plan-service"

export const FIXTURE_START_YEAR = 2026

const incomes: PeriodRow[] = [
	{
		id: "income-salary",
		typeId: "salary",
		frequency: "monthly",
		label: "Salary",
		startYear: 2026,
		startMonth: 0,
		endYear: 2055,
		endMonth: 11,
		amount: 100_000,
		growthMode: "override",
		growthRate: 0.03,
	},
	{
		id: "income-side",
		typeId: "sideHustle",
		frequency: "monthly",
		label: "Freelance gigs",
		startYear: 2026,
		startMonth: 0,
		endYear: null,
		endMonth: 11,
		amount: 15_000,
		growthMode: "inflation",
		growthRate: 0,
	},
]

const expenses: PeriodRow[] = [
	{
		id: "expense-living",
		typeId: "livingExpenses",
		frequency: "monthly",
		label: "Living expenses",
		startYear: 2026,
		startMonth: 0,
		endYear: null,
		endMonth: 11,
		amount: 40_000,
		growthMode: "inflation",
		growthRate: 0,
	},
	{
		id: "expense-rent",
		typeId: "rent",
		frequency: "monthly",
		label: "Condo rent",
		startYear: 2026,
		startMonth: 0,
		endYear: 2030,
		endMonth: 11,
		amount: 18_000,
		growthMode: "fixed",
		growthRate: 0,
	},
	{
		id: "expense-mortgage",
		typeId: "debt",
		frequency: "monthly",
		label: "Home loan",
		startYear: 2027,
		startMonth: 0,
		endYear: 2046,
		endMonth: 11,
		amount: 25_000,
		growthMode: "fixed",
		growthRate: 0,
		deductible: "mortgageInterest",
	},
]

const milestones: MilestoneRow[] = [
	{ id: "milestone-house", label: "Buy house", year: 2027, month: 0 },
	{ id: "milestone-retire", label: "Retire", year: 2055, month: 0 },
]

const assets: AssetRow[] = [
	{ id: "asset-stock", typeId: "stock", label: "SET index fund", value: 480_000 },
	{ id: "asset-car", typeId: "car", label: "Car", value: 620_000 },
]

const liabilities: LiabilityRow[] = [
	{ id: "liability-home", typeId: "debt", label: "Home loan", value: 2_400_000 },
	{ id: "liability-card", typeId: "creditCardDebt", label: "Credit card", value: 24_000 },
]

/** Deterministic plan used by every story that needs one. */
export function fixturePlan(): PlanInput {
	return {
		startYear: FIXTURE_START_YEAR,
		birthYear: 1996,
		inflation: 0.02,
		incomes: [...incomes],
		expenses: [...expenses],
		milestones: [...milestones],
		assets: [...assets],
		liabilities: [...liabilities],
		goals: [],
		retirementYear: 2055,
		retirementMonthlyToday: 40_000,
		savingsSplit: { emergency: 0.1, goal: 0.2, nontax: 0.5, taxAdvantaged: 0.2 },
		walletRates: {
			emergency: 0.015,
			goal: 0.015,
			nontax: 0.07,
			taxAdvantaged: 0.07,
		},
		startingWallets: {
			emergency: 120_000,
			goal: 0,
			nontax: 300_000,
			taxAdvantaged: 0,
		},
		efMonths: 6,
		personalAllowances: 1,
		spouseAllowances: 0,
		childrenAllowances: 0,
		parentsAllowances: 0,
		insurance: 25_000,
		annualWithholding: 0,
		horizonYears: 50,
	}
}
