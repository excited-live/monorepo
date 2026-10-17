import { useState } from "react";
import {
	calculateDerivedTreasury,
	type EntityAccount,
	type RevenueStream,
} from "@excited-live/biz";
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

	const personal = accounts.find((a) => a.type === "personal");
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
		setActiveEntityId,
		setActiveTab,
	};
}
