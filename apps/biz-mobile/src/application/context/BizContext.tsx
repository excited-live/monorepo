import React, { createContext, useEffect, useMemo, useState } from "react";
import {
	calculateCurrentTreasury,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_LIABILITIES,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import { authApi, setBearerToken } from "../../lib/api-client";
import { defaultStorage } from "../storage/local-storage.adapter";
import type { IStorageAdapter } from "../storage/storage.interface";
import {
	DEFAULT_PROFILE_AVATAR,
	type CapitalSubTab,
	type MobileLocale,
	type MobileTab,
	type UserSession,
} from "../../domain/types";

export interface BizContextType {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	activeEntityId: string;
	activeTab: MobileTab;
	activeCapitalSubTab: CapitalSubTab;
	selectedMonth: string; // "YYYY-MM"
	lang: MobileLocale;
	userSession: UserSession;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signInWithGoogle: (idToken: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateUserProfile: (profile: Partial<UserSession>) => void;
	setActiveEntityId: (id: string) => void;
	setActiveTab: (tab: MobileTab) => void;
	setActiveCapitalSubTab: (tab: CapitalSubTab) => void;
	setSelectedMonth: (month: string) => void;
	setLang: (lang: MobileLocale) => void;
	injectCapital: (fromEntityId: string, toEntityId: string, amount: number, note?: string) => void;
	updateCapitalTransfer: (transfer: CapitalTransfer) => void;
	deleteCapitalTransfer: (id: string) => void;
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
	setCareerIncome: (
		entityId: string,
		salary: number,
		paydayDayOfMonth?: number,
		title?: string,
		company?: string,
		imageUrl?: string,
	) => void;
	updateCareer: (
		entityId: string,
		career: {
			careerTitle?: string;
			careerCompany?: string;
			careerImageUrl?: string;
			salary?: number;
			paydayDayOfMonth?: number;
		},
	) => void;
	updateCashReserve: (entityId: string, newAmount: number) => void;
	addBusiness: (name: string, imageUrl?: string, startingTreasury?: number) => string;
	updateBusiness: (id: string, name: string, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	resetToBaseline: () => void;
	restoreBackup: (data: {
		accounts?: EntityAccount[];
		subscriptions?: RecurringSubscription[];
		hardware?: HardwareAsset[];
		revenues?: RevenueStream[];
		liabilities?: LiabilityStream[];
		transfers?: CapitalTransfer[];
		user?: UserSession;
	}) => void;
}

const STORAGE_PREFIX = "excited_live_mobile_data_v1";

export const DEFAULT_SESSION: UserSession = {
	id: "usr_guest",
	email: "",
	name: "Guest Solopreneur",
	orgName: "My Business",
	isAuthenticated: false,
	avatarUrl: DEFAULT_PROFILE_AVATAR,
};

export const BizContext = createContext<BizContextType | null>(null);

export interface BizProviderProps {
	children: React.ReactNode;
	storage?: IStorageAdapter;
	initialSession?: UserSession;
	initialAccounts?: EntityAccount[];
	initialSubscriptions?: RecurringSubscription[];
	initialHardware?: HardwareAsset[];
	initialRevenues?: RevenueStream[];
	initialLiabilities?: LiabilityStream[];
	initialTransfers?: CapitalTransfer[];
}

export const BizProvider: React.FC<BizProviderProps> = ({
	children,
	storage = defaultStorage,
	initialSession,
	initialAccounts,
	initialSubscriptions,
	initialHardware,
	initialRevenues,
	initialLiabilities,
	initialTransfers,
}) => {
	// Raw entity accounts from storage or seed (before derived treasury)
	const [rawAccounts, setRawAccounts] = useState<EntityAccount[]>(() => {
		if (initialAccounts) return initialAccounts;
		const saved = storage.getItem<EntityAccount[]>(`${STORAGE_PREFIX}_accounts`, SEED_ACCOUNTS);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_ACCOUNTS;
	});

	const [subscriptions, setSubscriptions] = useState<RecurringSubscription[]>(() => {
		if (initialSubscriptions) return initialSubscriptions;
		const saved = storage.getItem<RecurringSubscription[]>(`${STORAGE_PREFIX}_subs`, SEED_SUBSCRIPTIONS);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_SUBSCRIPTIONS;
	});

	const [hardware, setHardware] = useState<HardwareAsset[]>(() => {
		if (initialHardware) return initialHardware;
		const saved = storage.getItem<HardwareAsset[]>(`${STORAGE_PREFIX}_hw`, SEED_HARDWARE);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_HARDWARE;
	});

	const [revenues, setRevenues] = useState<RevenueStream[]>(() => {
		if (initialRevenues) return initialRevenues;
		const saved = storage.getItem<RevenueStream[]>(`${STORAGE_PREFIX}_rev`, SEED_REVENUES);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_REVENUES;
	});

	const [liabilities, setLiabilities] = useState<LiabilityStream[]>(() => {
		if (initialLiabilities) return initialLiabilities;
		const saved = storage.getItem<LiabilityStream[]>(`${STORAGE_PREFIX}_liab`, SEED_LIABILITIES);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_LIABILITIES;
	});

	const [transfers, setTransfers] = useState<CapitalTransfer[]>(() => {
		if (initialTransfers) return initialTransfers;
		const saved = storage.getItem<CapitalTransfer[]>(`${STORAGE_PREFIX}_tx`, SEED_TRANSFERS);
		return saved && Array.isArray(saved) && saved.length > 0 ? saved : SEED_TRANSFERS;
	});

	const [userSession, setUserSession] = useState<UserSession>(() => {
		if (initialSession) return initialSession;
		const saved = storage.getItem<UserSession>(`${STORAGE_PREFIX}_session`, DEFAULT_SESSION);
		return saved && typeof saved === "object" ? saved : DEFAULT_SESSION;
	});

	const [activeEntityId, setActiveEntityId] = useState<string>("acc_personal");
	const [activeTab, setActiveTab] = useState<MobileTab>("home");
	const [activeCapitalSubTab, setActiveCapitalSubTab] = useState<CapitalSubTab>("income");
	const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
	const [lang, setLang] = useState<MobileLocale>("en");

	// Session restoration from API
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
				setUserSession((prev: UserSession) => ({ ...prev, id: user.id, email: user.email, name: user.name }));
			})
			.catch(() => {
				// Offline or network unavailable: keep cached session
			});
	}, [userSession.isAuthenticated, userSession.token]);

	// Persistence to storage adapter
	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_accounts`, rawAccounts);
	}, [rawAccounts, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_subs`, subscriptions);
	}, [subscriptions, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_hw`, hardware);
	}, [hardware, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_rev`, revenues);
	}, [revenues, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_liab`, liabilities);
	}, [liabilities, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_tx`, transfers);
	}, [transfers, storage]);

	useEffect(() => {
		storage.setItem(`${STORAGE_PREFIX}_session`, userSession);
	}, [userSession, storage]);

	// Derived accounts: calculateCurrentTreasury derives cash on hand from cash assets and transfers
	const accounts = useMemo(() => {
		return rawAccounts.map((acc) => {
			const derived = calculateCurrentTreasury({
				account: acc,
				hardware,
				transfers,
			});
			return { ...acc, cashReserve: derived };
		});
	}, [rawAccounts, hardware, transfers]);

	const applySession = (token: string, user: { id: string; email: string; name: string }) => {
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

	const signInWithEmail = async (email: string, password: string) => {
		const res = await authApi.signIn(email, password);
		applySession(res.token, res.user);
	};

	const signInWithGoogle = async (idToken: string) => {
		const res = await authApi.signInWithGoogleIdToken(idToken);
		applySession(res.token, res.user);
	};

	const signOut = async () => {
		try {
			await authApi.signOut();
		} catch {
			// Best-effort remote sign out
		}
		setBearerToken(null);
		setUserSession(DEFAULT_SESSION);
	};

	const updateUserProfile = (profile: Partial<UserSession>) => {
		setUserSession((prev: UserSession) => ({ ...prev, ...profile }));
	};

	const injectCapital = (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note?: string,
	) => {
		const newTx: CapitalTransfer = {
			id: `tx_${Date.now()}`,
			fromEntityId,
			toEntityId,
			amount,
			date: selectedMonth,
			note: note || "Capital transfer",
		};
		setTransfers((prev) => [newTx, ...prev]);
	};

	const updateCapitalTransfer = (transfer: CapitalTransfer) => {
		setTransfers((prev) => prev.map((t) => (t.id === transfer.id ? transfer : t)));
	};

	const deleteCapitalTransfer = (id: string) => {
		setTransfers((prev) => prev.filter((t) => t.id !== id));
	};

	const addBusiness = (name: string, imageUrl?: string, startingTreasury?: number): string => {
		const newId = `acc_biz_${Date.now()}`;
		const newBiz: EntityAccount = {
			id: newId,
			name,
			type: "business",
			cashReserve: 0,
			currency: "THB",
			imageUrl,
		};
		setRawAccounts((prev) => [...prev, newBiz]);
		setActiveEntityId(newId);

		// When starting treasury is entered, record it as a regular CapitalTransfer from personal
		// so it pops up in the Capital subtab and is editable and manageable just like any other capital transfer!
		if (startingTreasury && startingTreasury > 0) {
			const initialTransfer: CapitalTransfer = {
				id: `tx_${Date.now()}`,
				fromEntityId: "acc_personal",
				toEntityId: newId,
				amount: startingTreasury,
				date: selectedMonth,
				note: `${name} Initial Capital`,
			};
			setTransfers((prev) => [initialTransfer, ...prev]);
		}
		return newId;
	};

	const updateBusiness = (id: string, name: string, imageUrl?: string) => {
		setRawAccounts((prev) =>
			prev.map((acc) => (acc.id === id ? { ...acc, name, imageUrl } : acc)),
		);
	};

	const updateCareer = (
		entityId: string,
		career: {
			careerTitle?: string;
			careerCompany?: string;
			careerImageUrl?: string;
			salary?: number;
			paydayDayOfMonth?: number;
		},
	) => {
		setRawAccounts((prev) =>
			prev.map((acc) => (acc.id === entityId ? { ...acc, ...career } : acc)),
		);
	};

	const setCareerIncome = (
		entityId: string,
		salary: number,
		paydayDayOfMonth = 28,
		title?: string,
		company?: string,
		imageUrl?: string,
	) => {
		setRawAccounts((prev: EntityAccount[]) =>
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
		setRevenues((prev: RevenueStream[]) => {
			const existingIdx = prev.findIndex(
				(r) => r.entityId === entityId && (r.source === "salary" || r.id === "rev_career_prame"),
			);
			if (existingIdx >= 0) {
				const updated = [...prev];
				const curr = updated[existingIdx]!;
				updated[existingIdx] = {
					...curr,
					amount: salary,
					name: title || curr.name || "Career Base Salary",
					active: salary > 0,
				};
				return updated;
			}
			if (salary > 0) {
				return [
					{
						id: `rev_career_${Date.now()}`,
						entityId,
						name: title || "Career Base Salary",
						amount: salary,
						frequency: "monthly",
						source: "salary",
						active: true,
					},
					...prev,
				];
			}
			return prev;
		});
	};

	const updateCashReserve = (entityId: string, newAmount: number) => {
		const targetAcc = accounts.find((a) => a.id === entityId);
		if (!targetAcc) return;
		const delta = newAmount - targetAcc.cashReserve;
		if (delta === 0) return;
		const adjustmentTx: CapitalTransfer = {
			id: `adj_${Date.now()}`,
			fromEntityId: delta < 0 ? entityId : "external",
			toEntityId: delta > 0 ? entityId : "external",
			amount: Math.abs(delta),
			date: selectedMonth,
			note: `Cash reserve manual calibration (${delta > 0 ? "+" : ""}${delta})`,
		};
		setTransfers((prev) => [adjustmentTx, ...prev]);
	};

	const deleteBusiness = (id: string) => {
		setRawAccounts((prev) => prev.filter((acc) => acc.id !== id));
		setSubscriptions((prev) => prev.filter((s) => s.entityId !== id));
		setHardware((prev) => prev.filter((h) => h.entityId !== id));
		setRevenues((prev) => prev.filter((r) => r.entityId !== id));
		setLiabilities((prev) => prev.filter((l) => l.entityId !== id));
		setTransfers((prev) => prev.filter((t) => t.fromEntityId !== id && t.toEntityId !== id));
		setActiveEntityId("acc_personal");
	};

	const addSubscription = (sub: Omit<RecurringSubscription, "id">) => {
		const newSub: RecurringSubscription = {
			...sub,
			id: `sub_${Date.now()}`,
		};
		setSubscriptions((prev) => [...prev, newSub]);
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
		setHardware((prev) => [...prev, newHw]);
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
		setRevenues((prev) => [...prev, newRev]);
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
		setLiabilities((prev) => [...prev, newLiab]);
	};

	const updateLiability = (liab: LiabilityStream) => {
		setLiabilities((prev) => prev.map((l) => (l.id === liab.id ? liab : l)));
	};

	const deleteLiability = (id: string) => {
		setLiabilities((prev) => prev.filter((l) => l.id !== id));
	};

	const resetToBaseline = () => {
		setRawAccounts(SEED_ACCOUNTS);
		setSubscriptions(SEED_SUBSCRIPTIONS);
		setHardware(SEED_HARDWARE);
		setRevenues(SEED_REVENUES);
		setLiabilities(SEED_LIABILITIES);
		setTransfers(SEED_TRANSFERS);
		setActiveEntityId("acc_personal");
	};

	const restoreBackup = (data: {
		accounts?: EntityAccount[];
		subscriptions?: RecurringSubscription[];
		hardware?: HardwareAsset[];
		revenues?: RevenueStream[];
		liabilities?: LiabilityStream[];
		transfers?: CapitalTransfer[];
		user?: UserSession;
	}) => {
		if (Array.isArray(data.accounts)) setRawAccounts(data.accounts);
		if (Array.isArray(data.subscriptions)) setSubscriptions(data.subscriptions);
		if (Array.isArray(data.hardware)) setHardware(data.hardware);
		if (Array.isArray(data.revenues)) setRevenues(data.revenues);
		if (Array.isArray(data.liabilities)) setLiabilities(data.liabilities);
		if (Array.isArray(data.transfers)) setTransfers(data.transfers);
		if (data.user && typeof data.user === "object") setUserSession(data.user);
	};

	const contextValue: BizContextType = {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		activeEntityId,
		setActiveEntityId,
		activeTab,
		setActiveTab,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		setSelectedMonth,
		lang,
		setLang,
		userSession,
		signInWithEmail,
		signInWithGoogle,
		signOut,
		updateUserProfile,
		injectCapital,
		updateCapitalTransfer,
		deleteCapitalTransfer,
		addBusiness,
		updateBusiness,
		deleteBusiness,
		updateCareer,
		setCareerIncome,
		updateCashReserve,
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
		resetToBaseline,
		restoreBackup,
	};

	return <BizContext.Provider value={contextValue}>{children}</BizContext.Provider>;
};
