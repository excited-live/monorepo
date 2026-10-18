import React, { createContext, useCallback, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { resolveInitialLocale, saveLocale } from "../i18n";
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
	/** Today as YYYY-MM-DD; NOW values and "current month" are relative to it. */
	today: string;
	lang: MobileLocale;
	setLang: (lang: MobileLocale) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

function getToday(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export interface UIProviderProps {
	children: ReactNode;
	initialTab?: MobileTab;
	initialEntityId?: string;
	initialMonth?: string;
	/** Pins "today" (YYYY-MM-DD), e.g. for deterministic visual tests. */
	initialToday?: string;
	initialCapitalSubTab?: CapitalSubTab;
	initialLang?: MobileLocale;
}

export function UIProvider({
	children,
	initialTab = "home",
	initialEntityId = "acc_personal",
	initialMonth,
	initialToday,
	initialCapitalSubTab = "capital",
	initialLang,
}: UIProviderProps) {
	const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);
	const [activeEntityId, setActiveEntityId] = useState<string>(initialEntityId);
	const [activeCapitalSubTab, setActiveCapitalSubTab] = useState<CapitalSubTab>(initialCapitalSubTab);
	const [today, setToday] = useState<string>(() => initialToday || getToday());
	// Keep "today" fresh while the app stays open (resume from background, midnight)
	useEffect(() => {
		if (initialToday) return;
		const refresh = () => setToday(getToday());
		const timer = window.setInterval(refresh, 60_000);
		document.addEventListener("visibilitychange", refresh);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [initialToday]);
	const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || today.slice(0, 7));
	const [lang, setLangState] = useState<MobileLocale>(() => initialLang ?? resolveInitialLocale());
	const setLang = useCallback((next: MobileLocale) => {
		setLangState(next);
		saveLocale(next);
	}, []);

	useEffect(() => {
		document.documentElement.lang = lang;
	}, [lang]);

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
			today,
			lang,
			setLang,
		}),
		[activeTab, activeEntityId, activeCapitalSubTab, selectedMonth, today, lang, setLang],
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
