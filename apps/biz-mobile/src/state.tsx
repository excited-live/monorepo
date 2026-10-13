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
import { authApi, setBearerToken } from "./lib/api-client";

export const DEFAULT_PROFILE_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

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
	activeTab: "home" | "capital" | "settings";
	activeCapitalSubTab: "income" | "expense" | "assets" | "liability";
	selectedMonth: string; // "YYYY-MM"
	lang: "en" | "th";
	userSession: UserSession;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateUserProfile: (profile: Partial<UserSession>) => void;
	setActiveEntityId: (id: string) => void;
	setActiveTab: (tab: "home" | "capital" | "settings") => void;
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
	setCareerIncome: (entityId: string, salary: number, paydayDayOfMonth?: number, title?: string, company?: string, imageUrl?: string) => void;
	updateCashReserve: (entityId: string, newAmount: number) => void;
	addBusiness: (name: string, initialCash: number, imageUrl?: string) => string;
	updateBusiness: (id: string, name: string, cashReserve: number, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	resetToBaseline: () => void;
}

const STORAGE_KEY = "excited_live_mobile_data_v1";

const DEFAULT_SESSION: UserSession = {
	id: "usr_guest",
	email: "",
	name: "Guest Solopreneur",
	orgName: "My Local Venture",
	isAuthenticated: false,
	avatarUrl: DEFAULT_PROFILE_AVATAR,
};

const BizContext = createContext<BizContextType | null>(null);

export const BizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [accounts, setAccounts] = useState<EntityAccount[]>(() => {
		const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
		if (!saved) return SEED_ACCOUNTS;
		try {
			const parsed = JSON.parse(saved) as EntityAccount[];
			return parsed.map((acc) => {
				if (acc.id === "acc_personal") {
					return {
						...acc,
						imageUrl: DEFAULT_PROFILE_AVATAR,
						careerTitle: acc.careerTitle || "Lead Product Designer & Engineer",
						careerCompany: acc.careerCompany || "Design Engineering Practice",
						careerImageUrl: acc.careerImageUrl || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
					};
				}
				return acc;
			});
		} catch {
			return SEED_ACCOUNTS;
		}
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
		if (!saved) return SEED_REVENUES;
		try {
			const parsed = JSON.parse(saved) as RevenueStream[];
			const hasCareerRev = parsed.some((r) => r.source === "salary" || r.id === "rev_career_prame");
			if (!hasCareerRev) {
				const careerSeed = SEED_REVENUES.find((r) => r.id === "rev_career_prame");
				return careerSeed ? [careerSeed, ...parsed] : parsed;
			}
			return parsed;
		} catch {
			return SEED_REVENUES;
		}
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
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return {
					...DEFAULT_SESSION,
					...parsed,
					avatarUrl: parsed.avatarUrl || DEFAULT_PROFILE_AVATAR,
				};
			} catch {
				return DEFAULT_SESSION;
			}
		}
		return DEFAULT_SESSION;
	});

	const [activeEntityId, setActiveEntityId] = useState<string>("acc_personal");
	const [activeTab, setActiveTab] = useState<"home" | "capital" | "settings">("home");
	const [activeCapitalSubTab, setActiveCapitalSubTab] = useState<"income" | "expense" | "assets" | "liability">("income");
	const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
	const [lang, setLang] = useState<"en" | "th">("en");

	// Restore a saved bearer session: validate the token against the API and
	// sign out locally when it is stale (expired or revoked server-side).
	useEffect(() => {
		const token = userSession.token;
		if (!userSession.isAuthenticated || !token) return;
		setBearerToken(token);
		authApi
			.me()
			.then((user) => {
				if (!user) {
					setUserSession(DEFAULT_SESSION);
					setBearerToken(null);
					return;
				}
				setUserSession((prev) => ({ ...prev, id: user.id, email: user.email, name: user.name }));
			})
			.catch(() => {
				// Network unavailable: keep the locally cached session and retry next launch.
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

	// In-app sign-in: email + password against the Better Auth tokens mount.
	// No system browser and no deep link — the session token comes back in the
	// sign-in response and only the token (never PII) is persisted.
	const signInWithEmail = async (email: string, password: string) => {
		const { token, user } = await authApi.signIn(email, password);
		setBearerToken(token);
		setUserSession({
			id: user.id,
			email: user.email,
			name: user.name,
			orgName: user.name,
			isAuthenticated: true,
			token,
		});
	};

	const signOut = async () => {
		await authApi.signOut();
		setBearerToken(null);
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

	const setCareerIncome = (
		entityId: string,
		salary: number,
		paydayDayOfMonth: number = 28,
		title?: string,
		company?: string,
		imageUrl?: string,
	) => {
		setAccounts((prev) =>
			prev.map((acc) =>
				acc.id === entityId
					? {
							...acc,
							salary,
							paydayDayOfMonth,
							...(title ? { careerTitle: title } : {}),
							...(company ? { careerCompany: company } : {}),
							...(imageUrl ? { careerImageUrl: imageUrl } : {}),
						}
					: acc,
			),
		);
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
				signInWithEmail,
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
				setCareerIncome,
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
