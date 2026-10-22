import { describe, expect, it } from "vitest";
import {
	countCompletedSteps,
	countOnboardingEntries,
	deriveOnboardingSteps,
	isOnboardingComplete,
	isOnboardingStepId,
	ONBOARDING_STEPS,
	type OnboardingStepId,
} from "../src/onboarding";

const emptyEntries = (): Record<OnboardingStepId, number> => ({
	create_account: 1,
	add_business: 0,
	assets_wallet: 0,
	add_liability: 0,
	add_income: 0,
	add_expense: 0,
});

describe("onboarding step model", () => {
	it("keeps the journey in order and marks the non-skippable steps", () => {
		expect(ONBOARDING_STEPS.map((step) => step.id)).toEqual([
			"create_account",
			"add_business",
			"assets_wallet",
			"add_liability",
			"add_income",
			"add_expense",
		]);
		expect(ONBOARDING_STEPS.filter((step) => !step.skippable).map((step) => step.id)).toEqual([
			"create_account",
			"add_income",
			"add_expense",
		]);
	});

	it("recognises only known step ids", () => {
		expect(isOnboardingStepId("add_income")).toBe(true);
		expect(isOnboardingStepId("nope")).toBe(false);
		expect(isOnboardingStepId(null)).toBe(false);
	});

	it("makes create_account done and the first pending step active", () => {
		const steps = deriveOnboardingSteps(emptyEntries(), { done: [], skipped: [] });
		expect(steps.map((step) => step.status)).toEqual([
			"done",
			"active",
			"pending",
			"pending",
			"pending",
			"pending",
		]);
		expect(countCompletedSteps(steps)).toBe(1);
		expect(isOnboardingComplete(steps)).toBe(false);
	});

	it("advances the frontier past done and skipped steps", () => {
		const steps = deriveOnboardingSteps(
			{ ...emptyEntries(), add_business: 1, assets_wallet: 2 },
			{ done: ["add_business"], skipped: ["assets_wallet"] },
		);
		expect(steps.find((step) => step.id === "add_business")).toMatchObject({
			status: "done",
			entryCount: 1,
			canComplete: true,
		});
		expect(steps.find((step) => step.id === "assets_wallet")).toMatchObject({
			status: "skipped",
			entryCount: 2,
			canComplete: true,
		});
		expect(steps.find((step) => step.id === "add_liability")?.status).toBe("active");
	});

	it("completes when every step is done or skipped", () => {
		const steps = deriveOnboardingSteps(emptyEntries(), {
			done: ["add_business", "assets_wallet", "add_liability", "add_income", "add_expense"],
			skipped: [],
		});
		expect(isOnboardingComplete(steps)).toBe(true);
		expect(countCompletedSteps(steps)).toBe(ONBOARDING_STEPS.length);
	});

	it("counts entries with the Home rule", () => {
		expect(
			countOnboardingEntries({
				businesses: 2,
				assets: 3,
				liabilities: 1,
				incomes: 4,
				expenses: 5,
			}),
		).toEqual({
			create_account: 1,
			add_business: 2,
			assets_wallet: 3,
			add_liability: 1,
			add_income: 4,
			add_expense: 5,
		});
	});
});
