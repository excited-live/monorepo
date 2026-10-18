/**
 * Pure onboarding step model: the ordered journey, its status derivation and
 * the local persistence shape. No React, no I/O beyond the storage helpers.
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
	skippable: boolean;
}

/** The onboarding journey, in order. */
export const ONBOARDING_STEPS: readonly OnboardingStepConfig[] = [
	{ id: "create_account", title: "Create Account", skippable: false },
	{ id: "add_business", title: "Add Business", skippable: true },
	{ id: "assets_wallet", title: "Wallet & Assets", skippable: true },
	{ id: "add_liability", title: "Add Liability", skippable: true },
	{ id: "add_income", title: "Add Income", skippable: false },
	{ id: "add_expense", title: "Add Expense", skippable: false },
];

export type OnboardingStepStatus = "done" | "skipped" | "active" | "pending";

export interface OnboardingProgress {
	done: OnboardingStepId[];
	skipped: OnboardingStepId[];
}

export const ONBOARDING_STORAGE_KEY = "biz_onboarding_v2";
export const LEGACY_LIABILITY_SKIP_KEY = "biz_onboarding_liability_skipped";

export function isOnboardingStepId(value: unknown): value is OnboardingStepId {
	return typeof value === "string" && ONBOARDING_STEPS.some((step) => step.id === value);
}

/**
 * Progress persisted in localStorage. Users coming from the old flow carried a
 * single `biz_onboarding_liability_skipped` flag; fold it into the skipped set.
 */
export function loadOnboardingProgress(): OnboardingProgress {
	try {
		const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
			return {
				done: (parsed.done ?? []).filter(isOnboardingStepId),
				skipped: (parsed.skipped ?? []).filter(isOnboardingStepId),
			};
		}
		if (localStorage.getItem(LEGACY_LIABILITY_SKIP_KEY) === "true") {
			return { done: [], skipped: ["add_liability"] };
		}
	} catch {
		// Storage unavailable (private mode / tests): nothing persisted yet.
	}
	return { done: [], skipped: [] };
}

export function persistOnboardingProgress(progress: OnboardingProgress): void {
	try {
		localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
	} catch {
		// Storage unavailable — progress stays in memory for this session.
	}
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

/** One editable row inside a step (an asset, income stream, expense, ...). */
export interface OnboardingEntryView {
	id: string;
	label: string;
	meta?: string;
}

/** Entries grouped per entity, personal first; businesses follow when they exist. */
export interface OnboardingEntitySectionView {
	entityId: string;
	entityName: string;
	entries: OnboardingEntryView[];
}

/** A step plus its already-recorded data, as rendered by the checklist. */
export interface OnboardingStepView extends OnboardingStepState {
	/** Flat entries (the Add Business step lists the businesses). */
	entries: OnboardingEntryView[];
	/** Per-entity entry groups for the data steps; empty for the others. */
	sections: OnboardingEntitySectionView[];
}

export function countCompletedSteps(steps: readonly OnboardingStepState[]): number {
	return steps.filter((step) => step.status === "done").length;
}
