/**
 * US-101 — Onboarding wizard model.
 *
 * answer → PlanInput note (AC#2 "every wizard answer is editable later in the
 * full inputs"). The wizard owns exactly four areas of the plan and nothing
 * else — wallets, savings split, allowances, horizon, assets, liabilities and
 * milestones stay exactly as the baseline set them:
 *
 *   wizard answer          PlanInput field                edit it afterwards
 *   salaryMonthly       →  incomes[] row "Salary"        dashboard → Income tab
 *   livingMonthly       →  expenses[] row "Living …"     dashboard → Expenses tab
 *   goals[]             →  goals[] (GoalRow)             dashboard → Goals tab
 *   retirementYear      →  retirementYear                dashboard → Retirement tab
 *   retirementMonthly.. →  retirementMonthlyToday        dashboard → Retirement tab
 *
 * Skipping a step keeps the baseline value for its fields — the wizard never
 * invents defaults, so "skip everything" lands on exactly the engine's TH
 * defaults from `defaultPlanInput()`.
 *
 * The wizard is re-runnable: `wizardAnswersFromPlan()` seeds it from the live
 * plan and `applyWizardAnswers(answers, plan)` writes back onto that same
 * baseline, so replaying the intro edits the plan instead of resetting it.
 *
 * No DOM / no storage here — storage helpers live at the bottom and are the
 * only browser-aware part (guarded, SSR-safe).
 */

import { defaultPlan, type GoalRow, type PeriodRow, type PlanInput } from "./plan-service"

/** Wizard state per step — all optional; null/undefined = user skipped. */
export interface WizardAnswers {
	/** Income step: monthly take-home-ish gross salary, THB/month. */
	salaryMonthly: number | null
	/** Expenses step: monthly living expenses, THB/month. */
	livingMonthly: number | null
	/** Goals step: 0..3 simple goals captured as (label, amount today, target year). */
	goals: WizardGoalDraft[]
	/** Retirement wish: calendar year to retire (null = keep default). */
	retirementYear: number | null
	/** Retirement wish: desired spending in retirement, THB/month, today's money. */
	retirementMonthlyToday: number | null
}

export interface WizardGoalDraft {
	label: string
	amountToday: number
	targetYear: number
	/**
	 * Passed through, never edited here: the wizard step has no wallet control
	 * (a wizard goal is "goal savings", engine default), but a replay must not
	 * silently move a goal the dashboard already funds from another wallet.
	 */
	wallet?: GoalRow["wallet"]
}

export function emptyWizardAnswers(): WizardAnswers {
	return {
		salaryMonthly: null,
		livingMonthly: null,
		goals: [],
		retirementYear: null,
		retirementMonthlyToday: null,
	}
}

/** The untouched baseline the dashboard seeds today — the skip-path source of truth. */
export function wizardBaselinePlan(): PlanInput {
	return defaultPlan()
}

const SALARY_LABEL = "Salary"
const LIVING_LABEL = "Living expenses"

/**
 * Apply wizard answers onto a baseline plan.
 *
 * Rules:
 * - Income/expenses: the baseline's default rows are matched by label and
 *   replaced in place (same id/typeId/growth semantics, only the amount is
 *   user-driven). If the baseline somehow lacks them, a row is added with
 *   engine-consistent defaults.
 * - Goals: replace the baseline's goals list wholesale (the wizard shows them
 *   all, so an empty step means "no goals").
 * - Retirement: only touched fields change.
 *
 * `baseline` defaults to the untouched engine plan (first run). Replaying the
 * intro passes the live plan instead, so a replay edits the user's real plan
 * rather than resetting everything the wizard does not own.
 */
export function applyWizardAnswers(
	answers: WizardAnswers,
	baseline: PlanInput = wizardBaselinePlan(),
): PlanInput {
	const plan = baseline

	const incomes = plan.incomes.map((row) =>
		row.label === SALARY_LABEL && answers.salaryMonthly !== null
			? { ...row, amount: answers.salaryMonthly }
			: row,
	)
	if (answers.salaryMonthly !== null && !incomes.some((row) => row.label === SALARY_LABEL)) {
		incomes.push(salaryRow(plan.startYear, answers.salaryMonthly))
	}

	const expenses = plan.expenses.map((row) =>
		row.label === LIVING_LABEL && answers.livingMonthly !== null
			? { ...row, amount: answers.livingMonthly }
			: row,
	)
	if (answers.livingMonthly !== null && !expenses.some((row) => row.label === LIVING_LABEL)) {
		expenses.push(livingRow(plan.startYear, answers.livingMonthly))
	}

	const goals: GoalRow[] = answers.goals.map((goal, index) => ({
		id: `goal-wizard-${index + 1}`,
		label: goal.label,
		amountToday: goal.amountToday,
		targetYear: goal.targetYear,
		wallet: goal.wallet ?? "goal",
	}))

	return {
		...plan,
		incomes,
		expenses,
		goals,
		retirementYear: answers.retirementYear ?? plan.retirementYear,
		retirementMonthlyToday:
			answers.retirementMonthlyToday ?? plan.retirementMonthlyToday,
	}
}

function salaryRow(startYear: number, amount: number): PeriodRow {
	return {
		id: "income-salary",
		typeId: "salary",
		frequency: "monthly",
		label: SALARY_LABEL,
		startYear,
		startMonth: 0,
		endYear: startYear + 29,
		endMonth: 11,
		amount,
		growthMode: "override",
		growthRate: 0.03,
	}
}

function livingRow(startYear: number, amount: number): PeriodRow {
	return {
		id: "expense-living",
		typeId: "livingExpenses",
		frequency: "monthly",
		label: LIVING_LABEL,
		startYear,
		startMonth: 0,
		endYear: null,
		endMonth: 11,
		amount,
		growthMode: "inflation",
		growthRate: 0,
	}
}

/**
 * Seed wizard answers from a live plan — the replay path. Whatever the user
 * already has (or edited in the dashboard) comes back into the wizard, so
 * replaying the intro is an edit, not a reset.
 */
export function wizardAnswersFromPlan(plan: PlanInput): WizardAnswers {
	const salary = plan.incomes.find((row) => row.label === SALARY_LABEL)
	const living = plan.expenses.find((row) => row.label === LIVING_LABEL)
	return {
		salaryMonthly: salary?.amount ?? null,
		livingMonthly: living?.amount ?? null,
		goals: plan.goals.map((goal) => ({
			label: goal.label,
			amountToday: goal.amountToday,
			targetYear: goal.targetYear,
			wallet: goal.wallet,
		})),
		retirementYear: plan.retirementYear,
		retirementMonthlyToday: plan.retirementMonthlyToday,
	}
}

/**
 * True when the plan is still the untouched engine default (nothing edited yet).
 *
 * Compares the REAL field set — every year field included. An earlier version
 * blanked startYear / endYear / retirementYear / targetYear before comparing,
 * so a plan whose ONLY edit was a year still read as "untouched baseline" and a
 * returning user was offered the first-run walkthrough again (FRO-71). Years are
 * user data, not volatility: the wizard owns `retirementYear`, every period row
 * carries its own start/end year and every goal carries a targetYear, so all of
 * them must be compared rather than ignored.
 *
 * The comparison is structural (key-order independent), so a plan that was
 * re-spread by an editor — which can reorder keys — is not mistaken for an edit.
 *
 * Residual (deliberately out of scope here; tracked by FRO-66 / PR #89): the
 * baseline is still derived from the browser clock, so a plan seeded in a
 * different calendar year than "now" reads as changed. Once the plan is
 * persisted server-side the gate should compare against the stored plan instead
 * of this local heuristic.
 */
export function isBaselinePlan(plan: PlanInput): boolean {
	return planEquals(plan, wizardBaselinePlan())
}

/** Structural (key-order independent) equality over plan JSON. */
function planEquals(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return false
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, index) => planEquals(item, b[index]))
		)
	}
	const left = a as Record<string, unknown>
	const right = b as Record<string, unknown>
	const keys = Object.keys(left)
	if (keys.length !== Object.keys(right).length) return false
	return keys.every(
		(key) =>
			Object.prototype.hasOwnProperty.call(right, key) && planEquals(left[key], right[key]),
	)
}

const ONBOARDED_KEY = "excited_live_onboarded"

/** Has this browser finished the wizard before? (mock-mode first-run signal) */
export function hasCompletedWizard(): boolean {
	if (typeof window === "undefined") return true
	try {
		return window.localStorage.getItem(ONBOARDED_KEY) === "1"
	} catch {
		return true
	}
}

/** Persist the wizard-completed flag for this browser. Best-effort. */
export function markWizardCompleted(): void {
	if (typeof window === "undefined") return
	try {
		window.localStorage.setItem(ONBOARDED_KEY, "1")
	} catch {
		// Storage unavailable (private mode) — first-run simply re-shows.
	}
}

/** Test/preview helper: forget the flag so the wizard shows again. */
export function resetWizardCompleted(): void {
	if (typeof window === "undefined") return
	try {
		window.localStorage.removeItem(ONBOARDED_KEY)
	} catch {
		// Ignore.
	}
}
