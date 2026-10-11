/**
 * FRO-71 — wizard first-run gate: isBaselinePlan() must compare the REAL field
 * set, year fields included.
 *
 * The gate (pages/welcome/welcome.tsx + pages/home/home.tsx) offers the
 * walkthrough only while the plan still equals the engine baseline. The old
 * stripVolatile() blanked startYear / endYear / retirementYear / targetYear
 * before comparing, so a plan whose ONLY edit was a year read as untouched and
 * a returning user got the walkthrough again. These tests pin every year field
 * into the comparison.
 *
 * This file lives outside apps/webapp/src on purpose: apps/webapp still has no
 * vitest dependency, and adding one would touch package.json + pnpm-lock.yaml,
 * which this fix is scoped away from (FRO-67 finding 8). Outside `src` the app's
 * `tsc --noEmit` (types: vite/client only) stays green. When vitest is added to
 * the app this can move next to lib/wizard.ts and join `pnpm test`.
 *
 * Run it with the workspace's own vitest binary (no config needed):
 *
 *   node <repo>/node_modules/.pnpm/vitest@<ver>/node_modules/vitest/vitest.mjs \
 *     run apps/webapp/tests/wizard.test.ts
 *
 * (`ls -d node_modules/.pnpm/vitest@*` finds <ver>; 3.2.7 at the time of writing.)
 */
import { describe, expect, it, vi } from "vitest"
import {
	applyWizardAnswers,
	emptyWizardAnswers,
	isBaselinePlan,
	wizardBaselinePlan,
} from "../src/lib/wizard"
import type { PlanInput } from "../src/lib/plan-service"

/** Deep copy so a mutation never leaks into the next case. */
function cloneBaseline(): PlanInput {
	return structuredClone(wizardBaselinePlan())
}

function firstIncomeRow(plan: PlanInput): PlanInput["incomes"][number] {
	const row = plan.incomes[0]
	if (!row) throw new Error("baseline has no income row")
	return row
}

function retirementYearOf(plan: PlanInput): number {
	const year = plan.retirementYear
	if (year === null) throw new Error("baseline has no retirementYear")
	return year
}

describe("isBaselinePlan (FRO-71)", () => {
	it("treats the untouched engine baseline as baseline (skip path)", () => {
		expect(isBaselinePlan(wizardBaselinePlan())).toBe(true)
	})

	it("keeps the skip-everything wizard path on the baseline", () => {
		expect(isBaselinePlan(applyWizardAnswers(emptyWizardAnswers()))).toBe(true)
	})

	it("detects a retirementYear-only edit as changed", () => {
		const plan = cloneBaseline()
		plan.retirementYear = retirementYearOf(plan) + 1
		// Guard: the ONLY difference from the baseline is that one year.
		expect({ ...plan, retirementYear: retirementYearOf(plan) - 1 }).toEqual(wizardBaselinePlan())
		expect(isBaselinePlan(plan)).toBe(false)
	})

	it("detects a plan startYear-only edit as changed", () => {
		const plan = cloneBaseline()
		plan.startYear += 1
		expect(isBaselinePlan(plan)).toBe(false)
	})

	it("detects an income-row startYear-only edit as changed", () => {
		const plan = cloneBaseline()
		firstIncomeRow(plan).startYear += 1
		expect(isBaselinePlan(plan)).toBe(false)
	})

	it("detects an income-row endYear-only edit as changed", () => {
		const plan = cloneBaseline()
		const row = firstIncomeRow(plan)
		row.endYear = (row.endYear ?? plan.startYear) + 1
		expect(isBaselinePlan(plan)).toBe(false)
	})

	it("still detects non-year edits (control)", () => {
		const retirement = cloneBaseline()
		retirement.retirementMonthlyToday += 1
		expect(isBaselinePlan(retirement)).toBe(false)

		const income = cloneBaseline()
		firstIncomeRow(income).amount += 1
		expect(isBaselinePlan(income)).toBe(false)
	})

	it("is key-order independent — a re-spread plan is not an edit", () => {
		const base = wizardBaselinePlan()
		const reordered = Object.fromEntries(Object.entries(base).reverse()) as PlanInput
		expect(isBaselinePlan(reordered)).toBe(true)
	})

	/**
	 * A targetYear-only edit is only observable when the baseline itself holds a
	 * goal (the engine default has none), so this case fakes a goal-bearing
	 * baseline and re-imports the modules to pick it up. Scoped to this test:
	 * vi.doMock + vi.resetModules leave the other cases on the real engine.
	 */
	it("detects a goal targetYear-only edit as changed (goal-bearing baseline)", async () => {
		vi.resetModules()
		vi.doMock("@excited-live/sim", async () => {
			const actual = await vi.importActual<typeof import("@excited-live/sim")>("@excited-live/sim")
			return {
				...actual,
				defaultPlanInput: (now?: Date) => {
					const plan = actual.defaultPlanInput(now)
					plan.goals = [
						{
							id: "goal-wizard-1",
							label: "House",
							amountToday: 2_500_000,
							targetYear: plan.startYear + 5,
							wallet: "goal",
						},
					]
					return plan
				},
			}
		})
		try {
			const mod = await import("../src/lib/wizard")
			const untouched = mod.wizardBaselinePlan()
			expect(mod.isBaselinePlan(untouched)).toBe(true)

			const edited = structuredClone(untouched)
			const goal = edited.goals[0]
			if (!goal) throw new Error("mocked baseline has no goal")
			goal.targetYear += 1
			expect(mod.isBaselinePlan(edited)).toBe(false)
		} finally {
			vi.doUnmock("@excited-live/sim")
			vi.resetModules()
		}
	})
})
