/**
 * Onboarding view types. The pure step model lives in `@excited-live/accounting`
 * so the API and the app share one definition (see packages/accounting).
 */

export {
	countCompletedSteps,
	countOnboardingEntries,
	deriveOnboardingSteps,
	isOnboardingComplete,
	isOnboardingStepId,
	ONBOARDING_STEPS,
} from "@excited-live/accounting";

export type {
	OnboardingEntryCounts,
	OnboardingProgress,
	OnboardingStepConfig,
	OnboardingStepId,
	OnboardingStepState,
	OnboardingStepStatus,
} from "@excited-live/accounting";

import type { OnboardingStepState } from "@excited-live/accounting";

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
