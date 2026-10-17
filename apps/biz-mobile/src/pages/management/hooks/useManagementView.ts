import { useState, useEffect } from "react";
import { useAppUI, useUserData } from "../../../state";
import { t } from "../../../utils/i18n";
import type { CapitalSubTab, MobileLocale, UserSession } from "../../../domain/types";

export interface ManagementViewSlice {
	userSession: UserSession;
	lang: MobileLocale;
	flipped: boolean;
	setFlipped: (flipped: boolean) => void;
	activeCapitalSubTab: CapitalSubTab;
	setActiveCapitalSubTab: (tab: CapitalSubTab) => void;
	subTabs: Array<{ id: CapitalSubTab; label: string }>;
	navigateToSettings: () => void;
}

export function useManagementView(): ManagementViewSlice {
	const { userSession } = useUserData();
	const { activeCapitalSubTab, setActiveCapitalSubTab, setActiveTab, lang } = useAppUI();
	const [flipped, setFlipped] = useState(false);

	// Capital sub-tab removed in favor of hero derivation; fallback to income if previously set
	useEffect(() => {
		if (activeCapitalSubTab === "capital") {
			setActiveCapitalSubTab("income");
		}
	}, [activeCapitalSubTab, setActiveCapitalSubTab]);

	const subTabs: Array<{ id: CapitalSubTab; label: string }> = [
		{ id: "income" as CapitalSubTab, label: t("subtab.income", lang) },
		{ id: "expense" as CapitalSubTab, label: t("subtab.expense", lang) },
		{ id: "assets" as CapitalSubTab, label: t("subtab.assets", lang) },
		{ id: "liability" as CapitalSubTab, label: t("subtab.liability", lang) },
	];

	return {
		userSession,
		lang,
		flipped,
		setFlipped,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		subTabs,
		navigateToSettings: () => setActiveTab("settings"),
	};
}
