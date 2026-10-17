import { useBiz } from "../context/useBiz";
import type { CapitalSubTab, MobileLocale, MobileTab } from "../../domain/types";

export interface AppUISlice {
	activeTab: MobileTab;
	setActiveTab: (tab: MobileTab) => void;
	activeEntityId: string;
	setActiveEntityId: (id: string) => void;
	activeCapitalSubTab: CapitalSubTab;
	setActiveCapitalSubTab: (tab: CapitalSubTab) => void;
	selectedMonth: string;
	setSelectedMonth: (month: string) => void;
	lang: MobileLocale;
	setLang: (lang: MobileLocale) => void;
}

export function useAppUI(): AppUISlice {
	const {
		activeTab,
		setActiveTab,
		activeEntityId,
		setActiveEntityId,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		setSelectedMonth,
		lang,
		setLang,
	} = useBiz();

	return {
		activeTab,
		setActiveTab,
		activeEntityId,
		setActiveEntityId,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		setSelectedMonth,
		lang,
		setLang,
	};
}
