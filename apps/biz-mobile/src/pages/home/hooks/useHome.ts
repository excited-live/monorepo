import { useMemo, useState } from "react";
import {
	calculateDerivedTreasury,
	calculateEntityCashOnHand,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/accounting";
import {
	calculateConsolidatedWealth,
	calculatePaydayCountdown,
} from "../../../domain/selectors";
import {
	countCompletedSteps,
	deriveOnboardingSteps,
	isOnboardingComplete,
	isOnboardingStepId,
	ONBOARDING_STEPS,
	type OnboardingEntryView,
	type OnboardingEntitySectionView,
	type OnboardingProgress,
	type OnboardingStepId,
	type OnboardingStepView,
} from "../../../domain/onboarding";
import { useFinances, useAppUI } from "../../../state";
import { t } from "../../../i18n";
import { formatMoney } from "../../../utils/format";
import { useOnboarding, useUpdateOnboarding } from "../../../service";

export function useHome() {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
	} = useFinances();

	const {
		setActiveEntityId,
		setActiveTab,
		today,
		lang,
	} = useAppUI();

	// Home always reports the CURRENT month: a month picked in the Management
	// month-stepper must not leak future-dated streams or transfers into it.
	const currentMonth = today.slice(0, 7);

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<EntityAccount | null>(null);
	const [isRevenueOpen, setIsRevenueOpen] = useState(false);
	const [isCareerOpen, setIsCareerOpen] = useState(false);
	const [careerStream, setCareerStream] = useState<RevenueStream | null>(null);

	// Onboarding drawers state
	const [isExpenseOpen, setIsExpenseOpen] = useState(false);
	const [selectedExpense, setSelectedExpense] = useState<RecurringSubscription | null>(null);
	const [isGearOpen, setIsGearOpen] = useState(false);
	const [selectedGear, setSelectedGear] = useState<HardwareAsset | null>(null);
	const [isLiabilityOpen, setIsLiabilityOpen] = useState(false);
	const [selectedLiability, setSelectedLiability] = useState<LiabilityStream | null>(null);

	const onboardingQuery = useOnboarding("biz-mobile");
	const updateOnboarding = useUpdateOnboarding("biz-mobile");

	// Server payloads carry plain step ids; keep only known steps so a stale or
	// malformed value can never fabricate a phantom checklist entry.
	const progress: OnboardingProgress = useMemo(() => ({
		done: (onboardingQuery.data?.done ?? ["create_account"]).filter(isOnboardingStepId),
		skipped: (onboardingQuery.data?.skipped ?? []).filter(isOnboardingStepId),
	}), [onboardingQuery.data?.done, onboardingQuery.data?.skipped]);

	const personal = accounts.find((a) => a.type === "personal");
	const personalId = personal?.id ?? "";
	const businessAccounts = accounts.filter((a) => a.type === "business");

	const needsCareer = personal ? !personal.salary : false;

	const { totalTreasury, totalEomTreasury, personalCash, businessCash } =
		calculateConsolidatedWealth({
			accounts,
			hardware,
			subscriptions,
			revenues,
			liabilities,
			transfers,
			yearMonth: currentMonth,
		});

	/**
	 * Cash in hand today for a single account: this month's transfers already
	 * applied, next month's never. Deploying capital moves this immediately.
	 */
	const cashOnHand = (acc: EntityAccount) =>
		calculateEntityCashOnHand({
			account: acc,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
			yearMonth: currentMonth,
		});

	/** End-of-month treasury for a single account (current month) */
	const eomTreasury = (acc: EntityAccount) =>
		calculateDerivedTreasury({
			account: acc,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
			yearMonth: currentMonth,
		});

	// --- Onboarding step state -------------------------------------------------

	const activeOf = <T extends { active?: boolean }>(list: T[]): T[] =>
		list.filter((entry) => entry.active !== false);

	const assetEntries = (entityId: string): OnboardingEntryView[] =>
		hardware
			.filter((h) => h.entityId === entityId)
			.map((h) => ({ id: h.id, label: h.name, meta: formatMoney(h.cost) }));
	const incomeEntries = (entityId: string): OnboardingEntryView[] =>
		activeOf(revenues)
			.filter((r) => r.entityId === entityId)
			.map((r) => ({ id: r.id, label: r.name, meta: formatMoney(r.amount) }));
	const expenseEntries = (entityId: string): OnboardingEntryView[] =>
		activeOf(subscriptions)
			.filter((s) => s.entityId === entityId)
			.map((s) => ({ id: s.id, label: s.name, meta: formatMoney(s.amount) }));
	const liabilityEntries = (entityId: string): OnboardingEntryView[] =>
		activeOf(liabilities)
			.filter((l) => l.entityId === entityId)
			.map((l) => ({ id: l.id, label: l.name, meta: formatMoney(l.amount) }));

	const entitySections = (
		entriesFor: (entityId: string) => OnboardingEntryView[],
	): OnboardingEntitySectionView[] =>
		[personal, ...businessAccounts]
			.filter((account): account is EntityAccount => Boolean(account))
			.map((account) => ({
				entityId: account.id,
				entityName: account.name,
				entries: entriesFor(account.id),
			}));

	const stepEntryCounts: Record<OnboardingStepId, number> = {
		create_account: 1,
		add_business: businessAccounts.length,
		assets_wallet: personalId ? hardware.filter((h) => h.entityId === personalId).length : 0,
		add_liability: personalId ? liabilityEntries(personalId).length : 0,
		add_income: personalId ? incomeEntries(personalId).length : 0,
		add_expense: personalId ? expenseEntries(personalId).length : 0,
	};

	const onboardingSteps: OnboardingStepView[] = deriveOnboardingSteps(stepEntryCounts, progress).map(
		(step) => ({
			...step,
			entries:
				step.id === "add_business"
					? businessAccounts.map((biz) => ({ id: biz.id, label: biz.name }))
					: [],
			sections:
				step.id === "assets_wallet"
					? entitySections(assetEntries)
					: step.id === "add_liability"
						? entitySections(liabilityEntries)
						: step.id === "add_income"
							? entitySections(incomeEntries)
							: step.id === "add_expense"
								? entitySections(expenseEntries)
								: [],
		}),
	);

	const onboardingActiveIndex = onboardingSteps.findIndex((step) => step.status === "active");
	const onboardingComplete = Boolean(onboardingQuery.data?.isCompleted) || isOnboardingComplete(onboardingSteps);
	const onboardingCompletedCount = countCompletedSteps(onboardingSteps);
	const isLiabilityResolved = onboardingSteps.some(
		(step) => step.id === "add_liability" && (step.status === "done" || step.status === "skipped"),
	);

	const updateProgress = (mutate: (current: OnboardingProgress) => OnboardingProgress) => {
		const next = mutate(progress);
		const nextSteps = deriveOnboardingSteps(stepEntryCounts, next);
		const isCompleted = isOnboardingComplete(nextSteps);

		updateOnboarding.mutate({
			done: next.done,
			skipped: next.skipped,
			isCompleted,
		});
	};

	const completeStep = (id: OnboardingStepId) => {
		updateProgress((current) => ({
			done: [...new Set([...current.done, id])],
			skipped: current.skipped.filter((skipped) => skipped !== id),
		}));
	};

	const skipStep = (id: OnboardingStepId) => {
		if (!ONBOARDING_STEPS.find((step) => step.id === id)?.skippable) return;
		updateProgress((current) => ({
			done: current.done.filter((done) => done !== id),
			skipped: [...new Set([...current.skipped, id])],
		}));
	};

	// --- Drawer openers --------------------------------------------------------

	const openBusinessEditor = (biz: EntityAccount | null) => {
		setSelectedBiz(biz);
		setIsDrawerOpen(true);
	};

	const openAssetEditor = (entityId: string, asset: HardwareAsset | null) => {
		setActiveEntityId(entityId);
		setSelectedGear(asset);
		setIsGearOpen(true);
	};

	const openIncomeEditor = (entityId: string, revenue: RevenueStream | null) => {
		setActiveEntityId(entityId);
		setCareerStream(revenue);
		setIsRevenueOpen(true);
	};

	const openExpenseEditor = (entityId: string, expense: RecurringSubscription | null) => {
		setActiveEntityId(entityId);
		setSelectedExpense(expense);
		setIsExpenseOpen(true);
	};

	const openLiabilityEditor = (entityId: string, liability: LiabilityStream | null) => {
		setActiveEntityId(entityId);
		setSelectedLiability(liability);
		setIsLiabilityOpen(true);
	};

	const openStepPrimary = (id: OnboardingStepId) => {
		switch (id) {
			case "add_business":
				openBusinessEditor(businessAccounts[0] ?? null);
				break;
			case "assets_wallet":
				openAssetEditor(personalId, hardware.find((h) => h.entityId === personalId) ?? null);
				break;
			case "add_liability":
				openLiabilityEditor(
					personalId,
					activeOf(liabilities).find((l) => l.entityId === personalId) ?? null,
				);
				break;
			case "add_income":
				openIncomeEditor(personalId, activeOf(revenues).find((r) => r.entityId === personalId) ?? null);
				break;
			case "add_expense":
				openExpenseEditor(
					personalId,
					activeOf(subscriptions).find((s) => s.entityId === personalId) ?? null,
				);
				break;
			case "create_account":
				break;
		}
	};

	const handleAddEntry = (id: OnboardingStepId, entityId: string) => {
		switch (id) {
			case "add_business":
				openBusinessEditor(null);
				break;
			case "assets_wallet":
				openAssetEditor(entityId, null);
				break;
			case "add_liability":
				openLiabilityEditor(entityId, null);
				break;
			case "add_income":
				openIncomeEditor(entityId, null);
				break;
			case "add_expense":
				openExpenseEditor(entityId, null);
				break;
			case "create_account":
				break;
		}
	};

	const handleEditEntry = (id: OnboardingStepId, entryId: string, entityId: string) => {
		switch (id) {
			case "add_business":
				openBusinessEditor(businessAccounts.find((biz) => biz.id === entryId) ?? null);
				break;
			case "assets_wallet":
				openAssetEditor(entityId, hardware.find((h) => h.id === entryId) ?? null);
				break;
			case "add_liability":
				openLiabilityEditor(entityId, liabilities.find((l) => l.id === entryId) ?? null);
				break;
			case "add_income":
				openIncomeEditor(entityId, revenues.find((r) => r.id === entryId) ?? null);
				break;
			case "add_expense":
				openExpenseEditor(entityId, subscriptions.find((s) => s.id === entryId) ?? null);
				break;
			case "create_account":
				break;
		}
	};

	/** Reopen a skipped step: clear the skip and jump into its editor. */
	const handleReopenStep = (id: OnboardingStepId) => {
		updateProgress((current) => ({
			done: current.done.filter((done) => done !== id),
			skipped: current.skipped.filter((skipped) => skipped !== id),
		}));
		openStepPrimary(id);
	};

	const openCareerEdit = (acc: EntityAccount) => {
		setActiveEntityId(acc.id);
		setIsCareerOpen(true);
	};

	const formatType = (entityType: string) => {
		return entityType === "personal" ? t("home.personal", lang) : t("home.businesses", lang);
	};

	const handleOpenAddBusiness = () => {
		openBusinessEditor(null);
	};

	const handleSkipLiability = () => {
		skipStep("add_liability");
	};

	return {
		accounts,
		lang,
		needsCareer,
		totalTreasury,
		totalEomTreasury,
		personalCash,
		businessCash,
		cashOnHand,
		eomTreasury,
		openCareerEdit,
		formatType,
		calculatePaydayCountdown,
		// Drawers state
		isDrawerOpen,
		setIsDrawerOpen,
		selectedBiz,
		setSelectedBiz,
		isRevenueOpen,
		setIsRevenueOpen,
		isCareerOpen,
		setIsCareerOpen,
		careerStream,
		setCareerStream,
		isExpenseOpen,
		setIsExpenseOpen,
		selectedExpense,
		setSelectedExpense,
		isGearOpen,
		setIsGearOpen,
		selectedGear,
		setSelectedGear,
		isLiabilityOpen,
		setIsLiabilityOpen,
		selectedLiability,
		setSelectedLiability,
		setActiveEntityId,
		setActiveTab,
		// Onboarding
		onboardingSteps,
		onboardingActiveIndex,
		onboardingComplete,
		onboardingCompletedCount,
		isLiabilityResolved,
		completeStep,
		skipStep,
		handleAddEntry,
		handleEditEntry,
		handleReopenStep,
		handleOpenAddBusiness,
		handleSkipLiability,
	};
}
