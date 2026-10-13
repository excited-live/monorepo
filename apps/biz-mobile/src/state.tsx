import React, { createContext, useContext, useEffect, useState } from "react";
import {
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_LIABILITIES,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
} from "@excited-live/biz";

export interface UserSession {
	id: string;
	email: string;
	name: string;
	orgName: string;
	isAuthenticated: boolean;
	avatarUrl?: string;
	token?: string;
}

interface BizContextType {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	activeEntityId: string;
	activeTab: "home" | "capital" | "ledger" | "settings";
	activeCapitalSubTab: "income" | "expense" | "assets" | "liability";
	selectedMonth: string; // "YYYY-MM"
	lang: "en" | "th";
	userSession: UserSession;
	loginWithWorkOS: () => Promise<void>;
	signOut: () => void;
	updateUserProfile: (profile: Partial<UserSession>) => void;
	setActiveEntityId: (id: string) => void;
	setActiveTab: (tab: "home" | "capital" | "ledger" | "settings") => void;
	setActiveCapitalSubTab: (tab: "income" | "expense" | "assets" | "liability") => void;
	setSelectedMonth: (month: string) => void;
	setLang: (lang: "en" | "th") => void;
	injectCapital: (fromEntityId: string, toEntityId: string, amount: number, note: string) => void;
	addSubscription: (sub: Omit<RecurringSubscription, "id">) => void;
	updateSubscription: (sub: RecurringSubscription) => void;
	deleteSubscription: (id: string) => void;
	addHardware: (hw: Omit<HardwareAsset, "id">) => void;
	updateHardware: (hw: HardwareAsset) => void;
	deleteHardware: (id: string) => void;
	addRevenue: (rev: Omit<RevenueStream, "id">) => void;
	updateRevenue: (rev: RevenueStream) => void;
	deleteRevenue: (id: string) => void;
	addLiability: (liab: Omit<LiabilityStream, "id">) => void;
	updateLiability: (liab: LiabilityStream) => void;
	deleteLiability: (id: string) => void;
	updateCashReserve: (entityId: string, newAmount: number) => void;
	addBusiness: (name: string, initialCash: number, imageUrl?: string) => string;
	updateBusiness: (id: string, name: string, cashReserve: number, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	resetToBaseline: () => void;
}

const STORAGE_KEY = "excited_biz_mobile_data_v1";

const DEFAULT_SESSION: UserSession = {
	id: "usr_guest",
	email: "",
	name: "Guest Solopreneur",
	orgName: "My Local Venture",
	isAuthenticated: false,
};

const BizContext = createContext<BizContextType | null>(null);

export const BizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [accounts, setAccounts] = useState<EntityAccount[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
		return saved ? JSON.parse(saved) : SEED_ACCOUNTS;
	});

	const [subscriptions, setSubscriptions] = useState<RecurringSubscription[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_subs`);
		return saved ? JSON.parse(saved) : SEED_SUBSCRIPTIONS;
	});

	const [hardware, setHardware] = useState<HardwareAsset[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_hw`);
		return saved ? JSON.parse(saved) : SEED_HARDWARE;
	});

	const [revenues, setRevenues] = useState<RevenueStream[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_rev`);
		return saved ? JSON.parse(saved) : SEED_REVENUES;
	});

	const [liabilities, setLiabilities] = useState<LiabilityStream[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_liab`);
		return saved ? JSON.parse(saved) : SEED_LIABILITIES;
	});

	const [transfers, setTransfers] = useState<CapitalTransfer[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_tx`);
		return saved ? JSON.parse(saved) : SEED_TRANSFERS;
	});

	const [userSession, setUserSession] = useState<UserSession>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_session`);
		return saved ? JSON.parse(saved) : DEFAULT_SESSION;
	});

	const [activeEntityId, setActiveEntityId] = useState<string>("acc_personal");
	const [activeTab, setActiveTab] = useState<"home" | "capital" | "ledger" | "settings">("home");
	const [activeCapitalSubTab, setActiveCapitalSubTab] = useState<"income" | "expense" | "assets" | "liability">("income");
	const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
	const [lang, setLang] = useState<"en" | "th">("en");

	// Intercept deep link callback tokens on launch
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get("token");
		const userId = urlParams.get("userId");
		const email = urlParams.get("email");
		const name = urlParams.get("name");

		if (token && userId) {
			const cleanName = name || email?.split("@")[0] || "Founder";
			const session: UserSession = {
				id: userId,
				email: email || "founder@excited.live",
				name: cleanName,
				orgName: `${cleanName}'s Studio`,
				isAuthenticated: true,
				token,
			};
			setUserSession(session);

			// Clean up query string from URL
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	// Persist changes to localStorage
	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
	}, [accounts]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_subs`, JSON.stringify(subscriptions));
	}, [subscriptions]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_hw`, JSON.stringify(hardware));
	}, [hardware]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_rev`, JSON.stringify(revenues));
	}, [revenues]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_liab`, JSON.stringify(liabilities));
	}, [liabilities]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_tx`, JSON.stringify(transfers));
	}, [transfers]);

	useEffect(() => {
		localStorage.setItem(`${STORAGE_KEY}_session`, JSON.stringify(userSession));
	}, [userSession]);

	const loginWithWorkOS = async () => {
		// Production WorkOS hosted authorization URL
		const workosUrl =
			"https://api.workos.com/user_management/authorize?client_id=client_01M1SKN5FJGT7094PS8BS2ECCB&provider=authkit&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback&response_type=code";

		// 1. If on native Android device, launch in external system browser
		const nativeBridge = (window as any).AndroidNative;
		if (nativeBridge && typeof nativeBridge.openBrowser === "function") {
			nativeBridge.openBrowser(workosUrl);
			return;
		}

		// 2. Fallback to window navigation
		if (typeof window !== "undefined") {
			window.open(workosUrl, "_blank") || (window.location.href = workosUrl);
		}
	};

	const signOut = () => {
		setUserSession(DEFAULT_SESSION);
	};

	const updateUserProfile = (profile: Partial<UserSession>) => {
		setUserSession((prev) => ({ ...prev, ...profile }));
	};

	const injectCapital = (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note: string,
	) => {
		const newTx: CapitalTransfer = {
			id: `tx_${Date.now()}`,
			fromEntityId,
			toEntityId,
			amount,
			date: new Date().toISOString().slice(0, 10),
			note,
		};

		setTransfers((prev) => [newTx, ...prev]);

		// Adjust account cash reserves
		setAccounts((prev) =>
			prev.map((acc) => {
				if (acc.id === fromEntityId) {
					return { ...acc, cashReserve: Math.max(0, acc.cashReserve - amount) };
				}
				if (acc.id === toEntityId) {
					return { ...acc, cashReserve: acc.cashReserve + amount };
				}
				return acc;
			}),
		);
	};

	const addSubscription = (sub: Omit<RecurringSubscription, "id">) => {
		const newSub: RecurringSubscription = {
			...sub,
			id: `sub_${Date.now()}`,
		};
		setSubscriptions((prev) => [newSub, ...prev]);
	};

	const updateSubscription = (sub: RecurringSubscription) => {
		setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? sub : s)));
	};

	const deleteSubscription = (id: string) => {
		setSubscriptions((prev) => prev.filter((s) => s.id !== id));
	};

	const addHardware = (hw: Omit<HardwareAsset, "id">) => {
		const newHw: HardwareAsset = {
			...hw,
			id: `hw_${Date.now()}`,
		};
		setHardware((prev) => [newHw, ...prev]);
	};

	const updateHardware = (hw: HardwareAsset) => {
		setHardware((prev) => prev.map((h) => (h.id === hw.id ? hw : h)));
	};

	const deleteHardware = (id: string) => {
		setHardware((prev) => prev.filter((h) => h.id !== id));
	};

	const addRevenue = (rev: Omit<RevenueStream, "id">) => {
		const newRev: RevenueStream = {
			...rev,
			id: `rev_${Date.now()}`,
		};
		setRevenues((prev) => [newRev, ...prev]);
	};

	const updateRevenue = (rev: RevenueStream) => {
		setRevenues((prev) => prev.map((r) => (r.id === rev.id ? rev : r)));
	};

	const deleteRevenue = (id: string) => {
		setRevenues((prev) => prev.filter((r) => r.id !== id));
	};

	const addLiability = (liab: Omit<LiabilityStream, "id">) => {
		const newLiab: LiabilityStream = {
			...liab,
			id: `liab_${Date.now()}`,
		};
		setLiabilities((prev) => [newLiab, ...prev]);
	};

	const updateLiability = (liab: LiabilityStream) => {
		setLiabilities((prev) => prev.map((l) => (l.id === liab.id ? liab : l)));
	};

	const deleteLiability = (id: string) => {
		setLiabilities((prev) => prev.filter((l) => l.id !== id));
	};

	const updateCashReserve = (entityId: string, newAmount: number) => {
		setAccounts((prev) =>
			prev.map((acc) => (acc.id === entityId ? { ...acc, cashReserve: newAmount } : acc)),
		);
	};

	const addBusiness = (name: string, initialCash: number, imageUrl?: string): string => {
		const newId = `acc_${Date.now()}`;
		const newBiz: EntityAccount = {
			id: newId,
			name,
			type: "business",
			cashReserve: initialCash,
			currency: "THB",
			createdAt: new Date().toISOString().slice(0, 10),
			imageUrl,
		};
		setAccounts((prev) => [...prev, newBiz]);
		setActiveEntityId(newId);
		return newId;
	};

	const updateBusiness = (id: string, name: string, cashReserve: number, imageUrl?: string) => {
		setAccounts((prev) =>
			prev.map((acc) => (acc.id === id ? { ...acc, name, cashReserve, imageUrl: imageUrl ?? acc.imageUrl } : acc)),
		);
	};

	const deleteBusiness = (id: string) => {
		setAccounts((prev) => prev.filter((acc) => acc.id !== id));
		setSubscriptions((prev) => prev.filter((s) => s.entityId !== id));
		setHardware((prev) => prev.filter((h) => h.entityId !== id));
		setRevenues((prev) => prev.filter((r) => r.entityId !== id));
		setTransfers((prev) => prev.filter((t) => t.fromEntityId !== id && t.toEntityId !== id));
		if (activeEntityId === id) {
			setActiveEntityId("acc_personal");
		}
	};

	const resetToBaseline = () => {
		setAccounts(SEED_ACCOUNTS);
		setSubscriptions(SEED_SUBSCRIPTIONS);
		setHardware(SEED_HARDWARE);
		setRevenues(SEED_REVENUES);
		setLiabilities(SEED_LIABILITIES);
		setTransfers(SEED_TRANSFERS);
		setActiveEntityId("acc_personal");
		setSelectedMonth("2026-10");
		setUserSession(DEFAULT_SESSION);
		localStorage.clear();
	};

	return (
		<BizContext.Provider
			value={{
				accounts,
				subscriptions,
				hardware,
				revenues,
				liabilities,
				transfers,
				activeEntityId,
				activeTab,
				activeCapitalSubTab,
				selectedMonth,
				lang,
				userSession,
				loginWithWorkOS,
				signOut,
				updateUserProfile,
				setActiveEntityId,
				setActiveTab,
				setActiveCapitalSubTab,
				setSelectedMonth,
				setLang,
				injectCapital,
				addSubscription,
				updateSubscription,
				deleteSubscription,
				addHardware,
				updateHardware,
				deleteHardware,
				addRevenue,
				updateRevenue,
				deleteRevenue,
				addLiability,
				updateLiability,
				deleteLiability,
				updateCashReserve,
				addBusiness,
				updateBusiness,
				deleteBusiness,
				resetToBaseline,
			}}
		>
			{children}
		</BizContext.Provider>
	);
};

export const useBiz = () => {
	const ctx = useContext(BizContext);
	if (!ctx) throw new Error("useBiz must be used within BizProvider");
	return ctx;
};
