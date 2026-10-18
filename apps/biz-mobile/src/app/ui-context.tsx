import React, { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import type { CapitalSubTab, MobileLocale, MobileTab } from "../domain/types";

export interface UIContextValue {
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

const UIContext = createContext<UIContextValue | null>(null);

function getDefaultMonth(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}`;
}

export interface UIProviderProps {
	children: ReactNode;
	initialTab?: MobileTab;
	initialEntityId?: string;
	initialMonth?: string;
	initialCapitalSubTab?: CapitalSubTab;
	initialLang?: MobileLocale;
}

export function UIProvider({
	children,
	initialTab = "home",
	initialEntityId = "acc_personal",
	initialMonth,
	initialCapitalSubTab = "capital",
	initialLang = "en",
}: UIProviderProps) {
	const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);
	const [activeEntityId, setActiveEntityId] = useState<string>(initialEntityId);
	const [activeCapitalSubTab, setActiveCapitalSubTab] = useState<CapitalSubTab>(initialCapitalSubTab);
	const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || getDefaultMonth());
	const [lang, setLang] = useState<MobileLocale>(initialLang);

	const value = useMemo<UIContextValue>(
		() => ({
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
		}),
		[activeTab, activeEntityId, activeCapitalSubTab, selectedMonth, lang],
	);

	return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUIContext(): UIContextValue {
	const ctx = useContext(UIContext);
	if (!ctx) {
		throw new Error("useUIContext must be used within a UIProvider");
	}
	return ctx;
}
