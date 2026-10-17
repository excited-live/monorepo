import React, { createContext, useEffect, useMemo, useRef, useState } from "react";
import {
	calculateCurrentTreasury,
	isCashAsset,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_LIABILITIES,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
	type BizSnapshot,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import { authApi, bizApi, setBearerToken } from "../../lib/api-client";
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
	cloudSyncStatus: "synced" | "syncing" | "offline" | "error";
	lastSyncedAt: string | null;
	syncWithCloud: () => Promise<void>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signInWithGoogle: (idToken: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateUserProfile: (profile: Partial<UserSession>) => void;
	setActiveEntityId: (id: string) => void;
	setActiveTab: (tab: MobileTab) => void;
	setActiveCapitalSubTab: (tab: CapitalSubTab) => void;
	setSelectedMonth: (month: string) => void;
	setLang: (lang: MobileLocale) => void;
	injectCapital: (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note?: string,
		frequency?: "one_time" | "monthly",
		targetAssetId?: string,
	) => void;
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
		startMonth?: string,
		endMonth?: string,
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

	// Cloud native sync state tracking
	const [cloudSyncStatus, setCloudSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("synced");
	const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
		return storage.getItem<string | null>(`${STORAGE_PREFIX}_last_synced_at`, null);
	});

	const isInitialLoadedRef = useRef(false);
	const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const latestStateRef = useRef({
		rawAccounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
	});

	useEffect(() => {
		latestStateRef.current = {
			rawAccounts,
			subscriptions,
			hardware,
			revenues,
			liabilities,
			transfers,
		};
	}, [rawAccounts, subscriptions, hardware, revenues, liabilities, transfers]);

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

	// Initial cloud synchronization & hydration from backend
	useEffect(() => {
		let isCancelled = false;
		const userId = userSession.isAuthenticated && userSession.id ? userSession.id : "default";

		async function initCloudSync() {
			try {
				const remote = await bizApi.getSnapshot(userId);
				if (isCancelled) return;

				if (remote && Array.isArray(remote.accounts) && remote.accounts.length > 0) {
					const hasLocalCustomData = storage.getItem<boolean>(`${STORAGE_PREFIX}_has_custom_data`, false);
					// If the remote server is uninitialized (isDefault=true) but user has local work,
					// push their local work to cloud so they never lose anything!
					if (remote.isDefault && hasLocalCustomData) {
						setCloudSyncStatus("syncing");
						const currentState = latestStateRef.current;
						const pushRes = await bizApi.syncSnapshot(
							{
								accounts: currentState.rawAccounts,
								subscriptions: currentState.subscriptions,
								hardware: currentState.hardware,
								revenues: currentState.revenues,
								transfers: currentState.transfers,
								liabilities: currentState.liabilities,
							},
							userId,
						);
						if (pushRes.ok) {
							const now = new Date().toISOString();
							setCloudSyncStatus("synced");
							setLastSyncedAt(now);
							storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, now);
						} else {
							setCloudSyncStatus("offline");
						}
					} else if (!remote.isDefault) {
						// Server has saved cloud data: hydrate client state
						setRawAccounts(remote.accounts);
						setSubscriptions(remote.subscriptions ?? []);
						setHardware(remote.hardware ?? []);
						setRevenues(remote.revenues ?? []);
						setLiabilities(remote.liabilities ?? SEED_LIABILITIES);
						setTransfers(remote.transfers ?? []);
						const syncedTimestamp = remote.updatedAt || new Date().toISOString();
						setCloudSyncStatus("synced");
						setLastSyncedAt(syncedTimestamp);
						storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, syncedTimestamp);
						storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
					} else {
						setCloudSyncStatus("synced");
					}
				} else {
					setCloudSyncStatus("offline");
				}
			} catch {
				if (!isCancelled) {
					setCloudSyncStatus("offline");
				}
			} finally {
				if (!isCancelled) {
					isInitialLoadedRef.current = true;
				}
			}
		}

		initCloudSync();

		return () => {
			isCancelled = true;
		};
	}, [userSession.isAuthenticated, userSession.id, storage]);

	// Persistence to storage adapter (instant local cache)
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

	// Continuous debounced cloud synchronization on any state mutation
	useEffect(() => {
		if (!isInitialLoadedRef.current) return;

		if (syncTimeoutRef.current) {
			clearTimeout(syncTimeoutRef.current);
		}

		setCloudSyncStatus("syncing");
		const userId = userSession.isAuthenticated && userSession.id ? userSession.id : "default";

		syncTimeoutRef.current = setTimeout(async () => {
			try {
				const snapshot: BizSnapshot = {
					accounts: rawAccounts,
					subscriptions,
					hardware,
					revenues,
					transfers,
					liabilities,
				};
				const res = await bizApi.syncSnapshot(snapshot, userId);
				if (res.ok) {
					const now = new Date().toISOString();
					setCloudSyncStatus("synced");
					setLastSyncedAt(now);
					storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, now);
					storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
				} else {
					setCloudSyncStatus("offline");
				}
			} catch {
				setCloudSyncStatus("offline");
			}
		}, 800);

		return () => {
			if (syncTimeoutRef.current) {
				clearTimeout(syncTimeoutRef.current);
			}
		};
	}, [rawAccounts, subscriptions, hardware, revenues, liabilities, transfers, userSession.isAuthenticated, userSession.id, storage]);

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

	const applySession = async (token: string, user: { id: string; email: string; name: string }) => {
		setBearerToken(token);
		setUserSession({
			id: user.id,
			email: user.email,
			name: user.name,
			orgName: user.name,
			isAuthenticated: true,
			token,
		});
		setCloudSyncStatus("syncing");
		try {
			const remote = await bizApi.getSnapshot(user.id);
			if (remote && !remote.isDefault && remote.accounts && remote.accounts.length > 0) {
				setRawAccounts(remote.accounts);
				setSubscriptions(remote.subscriptions ?? []);
				setHardware(remote.hardware ?? []);
				setRevenues(remote.revenues ?? []);
				setLiabilities(remote.liabilities ?? SEED_LIABILITIES);
				setTransfers(remote.transfers ?? []);
				const ts = remote.updatedAt || new Date().toISOString();
				setLastSyncedAt(ts);
				storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, ts);
				storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
				setCloudSyncStatus("synced");
			} else {
				// Newly connected account: save current state to user's cloud account
				const pushRes = await bizApi.syncSnapshot(
					{
						accounts: rawAccounts,
						subscriptions,
						hardware,
						revenues,
						transfers,
						liabilities,
					},
					user.id,
				);
				if (pushRes.ok) {
					const now = new Date().toISOString();
					setLastSyncedAt(now);
					storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, now);
					storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
					setCloudSyncStatus("synced");
				} else {
					setCloudSyncStatus("offline");
				}
			}
		} catch {
			setCloudSyncStatus("offline");
		}
	};

	const signInWithEmail = async (email: string, password: string) => {
		const res = await authApi.signIn(email, password);
		await applySession(res.token, res.user);
	};

	const signInWithGoogle = async (idToken: string) => {
		const res = await authApi.signInWithGoogleIdToken(idToken);
		await applySession(res.token, res.user);
	};

	const signOut = async () => {
		try {
			await authApi.signOut();
		} catch {
			// Best-effort remote sign out
		}
		setBearerToken(null);
		setUserSession(DEFAULT_SESSION);
		setCloudSyncStatus("synced");
	};

	const syncWithCloud = async () => {
		setCloudSyncStatus("syncing");
		const userId = userSession.isAuthenticated && userSession.id ? userSession.id : "default";
		try {
			const snapshot: BizSnapshot = {
				accounts: rawAccounts,
				subscriptions,
				hardware,
				revenues,
				transfers,
				liabilities,
			};
			const res = await bizApi.syncSnapshot(snapshot, userId);
			if (res.ok) {
				const now = new Date().toISOString();
				setCloudSyncStatus("synced");
				setLastSyncedAt(now);
				storage.setItem(`${STORAGE_PREFIX}_last_synced_at`, now);
				storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
			} else {
				setCloudSyncStatus("offline");
			}
		} catch {
			setCloudSyncStatus("offline");
		}
	};

	const updateUserProfile = (profile: Partial<UserSession>) => {
		setUserSession((prev: UserSession) => ({ ...prev, ...profile }));
	};

	const injectCapital = (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note?: string,
		frequency: "one_time" | "monthly" = "one_time",
		targetAssetId?: string,
	) => {
		const toCashAssets = hardware.filter((h) => h.entityId === toEntityId && isCashAsset(h));
		let resolvedTargetAssetId = targetAssetId;

		if (resolvedTargetAssetId === "primary_cash" || (!resolvedTargetAssetId && toCashAssets.length === 0)) {
			const existingPrimary = toCashAssets[0];
			if (existingPrimary) {
				resolvedTargetAssetId = existingPrimary.id;
			} else {
				const newAssetId = `hw_cash_${Date.now()}`;
				const newAsset: HardwareAsset = {
					id: newAssetId,
					entityId: toEntityId,
					name: "Primary Cash Account",
					cost: 0,
					lifespanMonths: 0,
					purchaseDate: selectedMonth,
					category: "cash",
				};
				setHardware((prev) => [...prev, newAsset]);
				resolvedTargetAssetId = newAssetId;
			}
		} else if (!resolvedTargetAssetId && toCashAssets.length > 0) {
			resolvedTargetAssetId = toCashAssets[0]?.id;
		}

		const newTx: CapitalTransfer = {
			id: `tx_${Date.now()}`,
			fromEntityId,
			toEntityId,
			amount,
			date: selectedMonth,
			note: note || "Capital transfer",
			frequency,
			...(resolvedTargetAssetId ? { targetAssetId: resolvedTargetAssetId } : {}),
		};
		setTransfers((prev) => [newTx, ...prev]);
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const updateCapitalTransfer = (transfer: CapitalTransfer) => {
		setTransfers((prev) => prev.map((t) => (t.id === transfer.id ? transfer : t)));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteCapitalTransfer = (id: string) => {
		setTransfers((prev) => prev.filter((t) => t.id !== id));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
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
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);

		// When starting treasury is entered, record it as a regular CapitalTransfer from personal
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
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
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
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const setCareerIncome = (
		entityId: string,
		salary: number,
		paydayDayOfMonth = 28,
		title?: string,
		company?: string,
		imageUrl?: string,
		startMonth?: string,
		endMonth?: string,
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
					source: "salary",
					...(startMonth !== undefined ? { startMonth: startMonth || undefined } : {}),
					...(endMonth !== undefined ? { endMonth: endMonth || undefined } : {}),
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
						startMonth: startMonth || undefined,
						endMonth: endMonth || undefined,
					},
					...prev,
				];
			}
			return prev;
		});
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteBusiness = (id: string) => {
		setRawAccounts((prev) => prev.filter((acc) => acc.id !== id));
		setSubscriptions((prev) => prev.filter((s) => s.entityId !== id));
		setHardware((prev) => prev.filter((h) => h.entityId !== id));
		setRevenues((prev) => prev.filter((r) => r.entityId !== id));
		setLiabilities((prev) => prev.filter((l) => l.entityId !== id));
		setTransfers((prev) => prev.filter((t) => t.fromEntityId !== id && t.toEntityId !== id));
		setActiveEntityId("acc_personal");
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const addSubscription = (sub: Omit<RecurringSubscription, "id">) => {
		const newSub: RecurringSubscription = {
			...sub,
			id: `sub_${Date.now()}`,
		};
		setSubscriptions((prev) => [...prev, newSub]);
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const updateSubscription = (sub: RecurringSubscription) => {
		setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? sub : s)));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteSubscription = (id: string) => {
		setSubscriptions((prev) => prev.filter((s) => s.id !== id));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const addHardware = (hw: Omit<HardwareAsset, "id">) => {
		const newHw: HardwareAsset = {
			...hw,
			id: `hw_${Date.now()}`,
		};
		setHardware((prev) => [...prev, newHw]);
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const updateHardware = (hw: HardwareAsset) => {
		setHardware((prev) => prev.map((h) => (h.id === hw.id ? hw : h)));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteHardware = (id: string) => {
		setHardware((prev) => prev.filter((h) => h.id !== id));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const addRevenue = (rev: Omit<RevenueStream, "id">) => {
		const newRev: RevenueStream = {
			...rev,
			id: `rev_${Date.now()}`,
		};
		setRevenues((prev) => [...prev, newRev]);
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const updateRevenue = (rev: RevenueStream) => {
		setRevenues((prev) => prev.map((r) => (r.id === rev.id ? rev : r)));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteRevenue = (id: string) => {
		const rev = revenues.find((r) => r.id === id);
		if (rev && (rev.source === "salary" || rev.id === "rev_career_prame")) {
			setRawAccounts((prev) =>
				prev.map((acc) =>
					acc.id === rev.entityId ? { ...acc, salary: 0 } : acc,
				),
			);
		}
		setRevenues((prev) => prev.filter((r) => r.id !== id));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const addLiability = (liab: Omit<LiabilityStream, "id">) => {
		const newLiab: LiabilityStream = {
			...liab,
			id: `liab_${Date.now()}`,
		};
		setLiabilities((prev) => [...prev, newLiab]);
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const updateLiability = (liab: LiabilityStream) => {
		setLiabilities((prev) => prev.map((l) => (l.id === liab.id ? liab : l)));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const deleteLiability = (id: string) => {
		setLiabilities((prev) => prev.filter((l) => l.id !== id));
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
	};

	const resetToBaseline = () => {
		storage.clear();
		setRawAccounts(SEED_ACCOUNTS);
		setSubscriptions(SEED_SUBSCRIPTIONS);
		setHardware(SEED_HARDWARE);
		setRevenues(SEED_REVENUES);
		setLiabilities(SEED_LIABILITIES);
		setTransfers(SEED_TRANSFERS);
		setUserSession(DEFAULT_SESSION);
		setActiveEntityId("acc_personal");
		setActiveTab("home");
		setActiveCapitalSubTab("income");
		setSelectedMonth("2026-10");
		storage.removeItem(`${STORAGE_PREFIX}_has_custom_data`);
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
		storage.setItem(`${STORAGE_PREFIX}_has_custom_data`, true);
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
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
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
