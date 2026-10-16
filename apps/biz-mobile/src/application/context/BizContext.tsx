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
	setCareerIncome: (
		entityId: string,
		salary: number,
		paydayDayOfMonth?: number,
		title?: string,
		company?: string,
		imageUrl?: string,
	) => void;
	updateCashReserve: (entityId: string, newAmount: number) => void;
	addBusiness: (name: string, imageUrl?: string) => string;
	updateBusiness: (id: string, name: string, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	resetToBaseline: () => void;
}

const STORAGE_PREFIX = "excited_live_mobile_data_v1";

const DEFAULT_SESSION: UserSession = {
	id: "usr_guest",
	email: "",
	name: "Guest Solopreneur",
	orgName: "My Local Business",
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
	const [rawAccounts, setRawAccounts] = useState<EntityAccount[]>(() => {
		if (initialAccounts) return initialAccounts;
		const saved = storage.getItem<EntityAccount[] | null>(`${STORAGE_PREFIX}_accounts`, null);
		if (!saved) return SEED_ACCOUNTS;
		return saved.map((acc) => {
			if (acc.id === "acc_personal") {
				return {
					...acc,
					imageUrl: DEFAULT_PROFILE_AVATAR,
					careerTitle: acc.careerTitle || "Lead Product Designer & Engineer",
					careerCompany: acc.careerCompany || "Design Engineering Practice",
					careerImageUrl:
						acc.careerImageUrl ||
						"https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
				};
			}
			return acc;
		});
	});

	const [subscriptions, setSubscriptions] = useState<RecurringSubscription[]>(() => {
		if (initialSubscriptions) return initialSubscriptions;
		return storage.getItem<RecurringSubscription[]>(`${STORAGE_PREFIX}_subs`, SEED_SUBSCRIPTIONS);
	});

	const [hardware, setHardware] = useState<HardwareAsset[]>(() => {
		if (initialHardware) return initialHardware;
		return storage.getItem<HardwareAsset[]>(`${STORAGE_PREFIX}_hw`, SEED_HARDWARE);
	});

	const [revenues, setRevenues] = useState<RevenueStream[]>(() => {
		if (initialRevenues) return initialRevenues;
		const saved = storage.getItem<RevenueStream[] | null>(`${STORAGE_PREFIX}_rev`, null);
		if (!saved) return SEED_REVENUES;
		const hasCareerRev = saved.some(
			(r) => r.source === "salary" || r.id === "rev_career_prame",
		);
		if (!hasCareerRev) {
			const careerSeed = SEED_REVENUES.find((r) => r.id === "rev_career_prame");
			return careerSeed ? [careerSeed, ...saved] : saved;
		}
		return saved;
	});

	const [liabilities, setLiabilities] = useState<LiabilityStream[]>(() => {
		if (initialLiabilities) return initialLiabilities;
		return storage.getItem<LiabilityStream[]>(`${STORAGE_PREFIX}_liab`, SEED_LIABILITIES);
	});

	const [transfers, setTransfers] = useState<CapitalTransfer[]>(() => {
		if (initialTransfers) return initialTransfers;
		return storage.getItem<CapitalTransfer[]>(`${STORAGE_PREFIX}_tx`, SEED_TRANSFERS);
	});

	const [userSession, setUserSession] = useState<UserSession>(() => {
		if (initialSession) return initialSession;
		const saved = storage.getItem<Partial<UserSession> | null>(`${STORAGE_PREFIX}_session`, null);
		if (saved) {
			return {
				...DEFAULT_SESSION,
				...saved,
				avatarUrl: saved.avatarUrl || DEFAULT_PROFILE_AVATAR,
			};
		}
		return DEFAULT_SESSION;
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
				setUserSession((prev) => ({ ...prev, id: user.id, email: user.email, name: user.name }));
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
		const { token, user } = await authApi.signIn(email, password);
		applySession(token, user);
	};

	const signInWithGoogle = async (idToken: string) => {
		const { token, user } = await authApi.signInWithGoogleIdToken(idToken);
		applySession(token, user);
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
		paydayDayOfMonth = 28,
		title?: string,
		company?: string,
		imageUrl?: string,
	) => {
		setRawAccounts((prev) =>
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
		setRevenues((prev) => {
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
			date: new Date().toISOString().slice(0, 10),
			note: `Cash reserve manual calibration (${delta > 0 ? "+" : ""}${delta})`,
		};
		setTransfers((prev) => [adjustmentTx, ...prev]);
	};

	const addBusiness = (name: string, imageUrl?: string): string => {
		const newId = `biz_${Date.now()}`;
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
		return newId;
	};

	const updateBusiness = (id: string, name: string, imageUrl?: string) => {
		setRawAccounts((prev) =>
			prev.map((acc) => (acc.id === id ? { ...acc, name, ...(imageUrl ? { imageUrl } : {}) } : acc)),
		);
	};

	const deleteBusiness = (id: string) => {
		setRawAccounts((prev) => prev.filter((acc) => acc.id !== id));
		setSubscriptions((prev) => prev.filter((s) => s.entityId !== id));
		setHardware((prev) => prev.filter((h) => h.entityId !== id));
		setRevenues((prev) => prev.filter((r) => r.entityId !== id));
		setLiabilities((prev) => prev.filter((l) => l.entityId !== id));
		setTransfers((prev) => prev.filter((t) => t.fromEntityId !== id && t.toEntityId !== id));
		if (activeEntityId === id) {
			setActiveEntityId("acc_personal");
		}
	};

	const resetToBaseline = () => {
		setRawAccounts(SEED_ACCOUNTS);
		setSubscriptions(SEED_SUBSCRIPTIONS);
		setHardware(SEED_HARDWARE);
		setRevenues(SEED_REVENUES);
		setLiabilities(SEED_LIABILITIES);
		setTransfers(SEED_TRANSFERS);
		setUserSession(DEFAULT_SESSION);
		setActiveEntityId("acc_personal");
		setSelectedMonth("2026-10");
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
				signInWithGoogle,
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
