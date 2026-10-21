/**
 * Pure onboarding step model: the ordered journey and its status derivation.
 * No React, no I/O — progress is server-backed (see apps/api onboarding store).
 *
 * Only "Create Account" completes itself. Every other step is completed when
 * the user taps Done (gated on having at least one entry) or, when skippable,
 * skipped. Skipping is always reversible.
 */

export type OnboardingStepId =
	| "create_account"
	| "add_business"
	| "assets_wallet"
	| "add_liability"
	| "add_income"
	| "add_expense";

export interface OnboardingStepConfig {
	id: OnboardingStepId;
	title: string;
	/** Compact label for the horizontal stepper bar. */
	shortTitle: string;
	skippable: boolean;
}

/** The onboarding journey, in order. */
export const ONBOARDING_STEPS: readonly OnboardingStepConfig[] = [
	{ id: "create_account", title: "Create Account", shortTitle: "Account", skippable: false },
	{ id: "add_business", title: "Add Business", shortTitle: "Business", skippable: true },
	{ id: "assets_wallet", title: "Wallet & Assets", shortTitle: "Assets", skippable: true },
	{ id: "add_liability", title: "Add Liability", shortTitle: "Liability", skippable: true },
	{ id: "add_income", title: "Add Income", shortTitle: "Income", skippable: false },
	{ id: "add_expense", title: "Add Expense", shortTitle: "Expense", skippable: false },
];

export type OnboardingStepStatus = "done" | "skipped" | "active" | "pending";

export interface OnboardingProgress {
	done: OnboardingStepId[];
	skipped: OnboardingStepId[];
}

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
	return typeof value === "string" && ONBOARDING_STEPS.some((step) => step.id === value);
}

export interface OnboardingStepState extends OnboardingStepConfig {
	status: OnboardingStepStatus;
	/** Entries the step already holds; drives the Done gate. */
	entryCount: number;
	/** True once there is at least one entry to complete the step with. */
	canComplete: boolean;
}

/**
 * Derive every step's status. "Create Account" is always done; the first step
 * neither done nor skipped is the active one (the frontier).
 */
export function deriveOnboardingSteps(
	entries: Record<OnboardingStepId, number>,
	progress: OnboardingProgress,
): OnboardingStepState[] {
	const done = new Set<OnboardingStepId>(["create_account", ...progress.done]);
	const skipped = new Set(progress.skipped);
	const firstPending = ONBOARDING_STEPS.findIndex((step) => !done.has(step.id) && !skipped.has(step.id));

	return ONBOARDING_STEPS.map((step, index) => {
		const isDone = done.has(step.id);
		const isSkipped = !isDone && skipped.has(step.id);
		const entryCount = entries[step.id] ?? 0;
		const status: OnboardingStepStatus = isDone
			? "done"
			: isSkipped
				? "skipped"
				: index === firstPending
					? "active"
					: "pending";
		return { ...step, status, entryCount, canComplete: entryCount > 0 };
	});
}

export function isOnboardingComplete(steps: readonly OnboardingStepState[]): boolean {
	return steps.every((step) => step.status === "done" || step.status === "skipped");
}

export function countCompletedSteps(steps: readonly OnboardingStepState[]): number {
	return steps.filter((step) => step.status === "done").length;
}

/**
 * Entry counts per step, from the same rule the Home checklist uses:
 * businesses are every business entity; the other data steps count the rows of
 * that kind on the PERSONAL entity only. `assets` is the personal `hardware`
 * list, which includes cash wallets as well as gear.
 */
export interface OnboardingEntryCounts {
	/** Business entities the user owns. */
	businesses: number;
	/** Personal-entity assets (cash wallets and gear). */
	assets: number;
	/** Personal-entity liabilities. */
	liabilities: number;
	/** Personal-entity incomes. */
	incomes: number;
	/** Personal-entity expenses and subscriptions. */
	expenses: number;
}

export function countOnboardingEntries(counts: OnboardingEntryCounts): Record<OnboardingStepId, number> {
	return {
		create_account: 1,
		add_business: counts.businesses,
		assets_wallet: counts.assets,
		add_liability: counts.liabilities,
		add_income: counts.incomes,
		add_expense: counts.expenses,
	};
}
