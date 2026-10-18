import { useState } from "react";
import {
	calculateDerivedTreasury,
	isCashAsset,
	type EntityAccount,
	type HardwareAsset,
	type RevenueStream,
} from "@excited-live/accounting";
import {
	calculateConsolidatedWealth,
	calculatePaydayCountdown,
} from "../../../domain/selectors";
import { useFinances, useAppUI } from "../../../state";
import { t } from "../../../utils/i18n";

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
		lang,
	} = useAppUI();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<EntityAccount | null>(null);
	const [isRevenueOpen, setIsRevenueOpen] = useState(false);
	const [isCareerOpen, setIsCareerOpen] = useState(false);
	const [careerStream, setCareerStream] = useState<RevenueStream | null>(null);

	// Onboarding drawers state
	const [isExpenseOpen, setIsExpenseOpen] = useState(false);
	const [isGearOpen, setIsGearOpen] = useState(false);
	const [selectedGear, setSelectedGear] = useState<HardwareAsset | null>(null);
	const [isLiabilityOpen, setIsLiabilityOpen] = useState(false);
	const [hasSkippedLiability, setHasSkippedLiability] = useState(() => {
		try {
			return localStorage.getItem("biz_onboarding_liability_skipped") === "true";
		} catch {
			return false;
		}
	});

	const personal = accounts.find((a) => a.type === "personal");
	const personalDefaultWallet =
		hardware.find((h) => h.entityId === personal?.id && isCashAsset(h) && h.isDefault) ||
		hardware.find((h) => h.entityId === personal?.id && isCashAsset(h)) ||
		null;

	const isWalletDone = Boolean(
		personalDefaultWallet && (personalDefaultWallet.cost > 0 || personalDefaultWallet.name !== "My Living Main Wallet"),
	);
	const isCareerDone = Boolean(personal?.salary && personal.salary > 0);
	const isExpenseDone = subscriptions.some((s) => s.entityId === personal?.id);
	const isAssetsDone = hardware.some((h) => h.entityId === personal?.id && !isCashAsset(h));
	const isLiabilityDone = liabilities.some((l) => l.entityId === personal?.id) || hasSkippedLiability;
	const isBusinessDone = accounts.some((a) => a.type === "business");

	const needsCareer = personal ? !personal.salary : false;

	const { totalTreasury, totalEomTreasury, personalCash, businessCash } =
		calculateConsolidatedWealth({
			accounts,
			hardware,
			subscriptions,
			revenues,
			liabilities,
			transfers,
		});

	/** End-of-month treasury for a single account */
	const eomTreasury = (acc: EntityAccount) =>
		calculateDerivedTreasury({
			account: acc,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
		});

	const openCareerEdit = (acc: EntityAccount) => {
		setActiveEntityId(acc.id);
		setIsCareerOpen(true);
	};

	const formatType = (entityType: string) => {
		return entityType === "personal" ? t("home.personal", lang) : t("home.businesses", lang);
	};

	const handleOpenWalletEdit = () => {
		if (personal) {
			setActiveEntityId(personal.id);
			if (personalDefaultWallet) {
				setSelectedGear(personalDefaultWallet);
			} else {
				setSelectedGear({
					id: `hw_wallet_${Date.now()}`,
					entityId: personal.id,
					name: "Kasikorn Main Reserve",
					cost: 0,
					lifespanMonths: 0,
					purchaseDate: "2026-10",
					category: "cash",
					isDefault: true,
				});
			}
			setIsGearOpen(true);
		}
	};

	const handleOpenAddExpense = () => {
		if (personal) setActiveEntityId(personal.id);
		setIsExpenseOpen(true);
	};

	const handleOpenAddAssets = () => {
		if (personal) setActiveEntityId(personal.id);
		setSelectedGear(null);
		setIsGearOpen(true);
	};

	const handleOpenAddLiability = () => {
		if (personal) setActiveEntityId(personal.id);
		setIsLiabilityOpen(true);
	};

	const handleSkipLiability = () => {
		try {
			localStorage.setItem("biz_onboarding_liability_skipped", "true");
		} catch {
			// localStorage unavailable — nothing to persist
		}
		setHasSkippedLiability(true);
	};

	const handleOpenAddBusiness = () => {
		setSelectedBiz(null);
		setIsDrawerOpen(true);
	};

	return {
		accounts,
		lang,
		needsCareer,
		totalTreasury,
		totalEomTreasury,
		personalCash,
		businessCash,
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
		isGearOpen,
		setIsGearOpen,
		selectedGear,
		setSelectedGear,
		isLiabilityOpen,
		setIsLiabilityOpen,
		hasSkippedLiability,
		setActiveEntityId,
		setActiveTab,
		// Onboarding handlers & completion state
		isWalletDone,
		isCareerDone,
		isExpenseDone,
		isAssetsDone,
		isLiabilityDone,
		isBusinessDone,
		handleOpenWalletEdit,
		handleOpenAddExpense,
		handleOpenAddAssets,
		handleOpenAddLiability,
		handleSkipLiability,
		handleOpenAddBusiness,
	};
}
