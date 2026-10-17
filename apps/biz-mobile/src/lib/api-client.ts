import type {
	BizSnapshot,
	EntityAccount,
	MonthlyLedger,
	RecurringSubscription,
	HardwareAsset,
	RevenueStream,
	CapitalTransfer,
	LiabilityStream,
	CatalogItem,
} from "@excited-live/biz";

export type { BizSnapshot, MonthlyLedger };

declare const __TAURI_DEV_HOST__: string | undefined;

export const getApiRoot = (): string => {
	if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
	if (typeof __TAURI_DEV_HOST__ !== "undefined" && __TAURI_DEV_HOST__) {
		return `http://${__TAURI_DEV_HOST__}:8000/api/v1`;
	}
	if (typeof window !== "undefined" && window.location) {
		const host = window.location.hostname;
		// Inside Tauri Android WebView, the origin is http://tauri.localhost.
		// In Android's Chromium WebViewClient, `shouldInterceptRequest` intercepts tauri.localhost
		// and strips POST request bodies entirely. We must connect directly to the dev machine LAN IP:
		if (host === "tauri.localhost") {
			return "http://192.168.1.130:8000/api/v1";
		}
	}
	return "/api/v1";
};

const API_ROOT = getApiRoot();
const BIZ_BASE = `${API_ROOT}/biz`;
const CATALOG_BASE = `${API_ROOT}/catalog`;

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	image?: string | null;
}

export interface SessionResponse {
	user: AuthUser;
	session: {
		id: string;
		userId: string;
		token: string;
		expiresAt: string;
	};
}

let bearerToken: string | null = null;

export function setBearerToken(token: string | null): void {
	bearerToken = token;
	if (token) {
		try {
			localStorage.setItem("biz_auth_token", token);
		} catch {
			// ignore storage errors
		}
	} else {
		try {
			localStorage.removeItem("biz_auth_token");
		} catch {
			// ignore
		}
	}
}

export function setAuthToken(token: string | null): void {
	setBearerToken(token);
}

export function getAuthToken(): string | null {
	if (bearerToken) return bearerToken;
	try {
		bearerToken = localStorage.getItem("biz_auth_token");
	} catch {
		// ignore
	}
	return bearerToken;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	const token = getAuthToken();
	return {
		...extra,
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

async function authErrorMessage(res: Response): Promise<string> {
	try {
		const clone = res.clone();
		const body = (await clone.json()) as { message?: string; error?: string; code?: string };
		return body.message || body.error || body.code || `HTTP ${res.status}`;
	} catch {
		try {
			const text = await res.text();
			return text || `HTTP ${res.status}`;
		} catch {
			return `HTTP ${res.status}`;
		}
	}
}

export const authApi = {
	async signIn(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
		const cleanEmail = email.trim();
		const res = await fetch(`${API_ROOT}/auth/sign-in/email`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: cleanEmail, password }),
		});
		if (!res.ok) {
			throw new Error((await authErrorMessage(res)) || "Sign-in failed");
		}
		const data = (await res.json().catch(() => null)) as { token?: string; user?: AuthUser } | null;
		const token = res.headers.get("set-auth-token") ?? data?.token;
		if (!token) {
			throw new Error("Sign-in did not return a session token");
		}
		setBearerToken(token);
		const user = data?.user ?? (await authApi.me());
		if (!user) {
			throw new Error("Sign-in succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async signUpEmail(email: string, password: string, name: string): Promise<{ token: string; user: AuthUser }> {
		const cleanEmail = email.trim();
		const res = await fetch(`${API_ROOT}/auth/sign-up/email`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: cleanEmail, password, name: name.trim() || "Solopreneur" }),
		});
		if (!res.ok) {
			throw new Error((await authErrorMessage(res)) || "Sign-up failed");
		}
		const data = (await res.json().catch(() => null)) as { token?: string; user?: AuthUser } | null;
		const token = res.headers.get("set-auth-token") ?? data?.token;
		if (!token) {
			throw new Error("Sign-up did not return a session token");
		}
		setBearerToken(token);
		const user = data?.user ?? (await authApi.me());
		if (!user) {
			throw new Error("Sign-up succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async signInWithGoogleIdToken(idToken: string): Promise<{ token: string; user: AuthUser }> {
		const res = await fetch(`${API_ROOT}/auth/sign-in/social`, {
			method: "POST",
			headers: { "content-type": "application/json", Authorization: "Bearer" },
			body: JSON.stringify({ provider: "google", idToken: { token: idToken } }),
		});
		if (!res.ok) {
			throw new Error((await authErrorMessage(res)) || "Google sign-in failed");
		}
		const data = (await res.json().catch(() => null)) as { token?: string } | null;
		const token = data?.token ?? res.headers.get("set-auth-token");
		if (!token) {
			throw new Error("Google sign-in did not return a session token");
		}
		setBearerToken(token);
		const user = await authApi.me();
		if (!user) {
			throw new Error("Google sign-in succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async signInSocial(provider: "google" | "github", idToken?: string, accessToken?: string): Promise<SessionResponse> {
		const res = await fetch(`${API_ROOT}/auth/sign-in/social`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ provider, idToken, accessToken }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({ message: `Social sign-in with ${provider} failed` }));
			throw new Error(err.message || `HTTP ${res.status}`);
		}
		const setToken = res.headers.get("set-auth-token");
		const data = await res.json();
		if (setToken) {
			setBearerToken(setToken);
		} else if (data?.session?.token) {
			setBearerToken(data.session.token);
		}
		return data;
	},

	async me(): Promise<AuthUser | null> {
		if (!bearerToken) return null;
		try {
			const res = await fetch(`${API_ROOT}/auth/me`, {
				headers: authHeaders(),
			});
			if (!res.ok) {
				if (res.status === 401) {
					setBearerToken(null);
				}
				return null;
			}
			const data = (await res.json()) as { user?: AuthUser };
			return data.user ?? null;
		} catch {
			return null;
		}
	},

	async getMe(): Promise<AuthUser | null> {
		return authApi.me();
	},

	async signOut(): Promise<void> {
		try {
			if (bearerToken) {
				await fetch(`${API_ROOT}/auth/sign-out`, {
					method: "POST",
					headers: authHeaders({ "content-type": "application/json" }),
					body: JSON.stringify({}),
				});
			}
		} catch {
			// best effort
		} finally {
			setBearerToken(null);
		}
	},
};

export interface CatalogSuggestResponse {
	query: string;
	currency: string;
	bestMatch: (CatalogItem & { amount?: number }) | null;
	suggestions: (CatalogItem & { amount?: number })[];
	fallbackFavicon: string | null;
}

export interface CatalogResolveRequest {
	query: string;
	currency?: string;
	type?: "subscription" | "hardware" | "career" | "revenue";
	touchedFields?: {
		amount?: boolean;
		cycle?: boolean;
		category?: boolean;
		imageUrl?: boolean;
	};
	currentValues?: {
		amount?: number | string;
		cycle?: string;
		category?: string;
		imageUrl?: string;
	};
}

export interface CatalogResolveResponse {
	match: CatalogItem | null;
	suggestions: CatalogItem[];
	autofill: {
		name?: string;
		amount?: number;
		cycle?: string;
		category?: string;
		imageUrl?: string;
		coverImageUrl?: string;
	};
	source: "preset" | "dynamic_domain" | "none";
}

export const catalogApi = {
	async suggest(query: string, currency = "THB", type?: string): Promise<CatalogSuggestResponse> {
		const params = new URLSearchParams({ q: query, currency });
		if (type) params.set("type", type);
		const res = await fetch(`${CATALOG_BASE}/suggest?${params.toString()}`);
		if (!res.ok) throw new Error(`Suggest failed HTTP ${res.status}`);
		return res.json();
	},

	async resolve(payload: CatalogResolveRequest): Promise<CatalogResolveResponse> {
		const res = await fetch(`${CATALOG_BASE}/resolve`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Resolve failed HTTP ${res.status}`);
		return res.json();
	},
};

export interface SyncResult {
	ok: boolean;
	data?: BizSnapshot;
	error?: string;
}

export const bizApi = {
	async getSnapshot(userId = "default"): Promise<BizSnapshot | null> {
		try {
			const res = await fetch(BIZ_BASE, {
				headers: authHeaders({ "x-user-id": userId }),
			});
			if (!res.ok) return null;
			return (await res.json()) as BizSnapshot;
		} catch {
			return null;
		}
	},

	async syncSnapshot(snapshot: BizSnapshot, userId = "default"): Promise<SyncResult> {
		try {
			const res = await fetch(BIZ_BASE, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(snapshot),
			});
			if (!res.ok) {
				return { ok: false, error: `HTTP ${res.status}` };
			}
			const result = (await res.json()) as { ok: boolean; data?: BizSnapshot };
			return { ok: true, data: result.data };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : "Network error" };
		}
	},

	async addAccount(account: EntityAccount, userId = "default"): Promise<EntityAccount | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/accounts`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(account),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async updateAccount(id: string, update: Partial<EntityAccount>, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/accounts/${id}`, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(update),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async deleteAccount(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/accounts/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async addSubscription(sub: RecurringSubscription, userId = "default"): Promise<RecurringSubscription | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/subscriptions`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(sub),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async updateSubscription(id: string, update: Partial<RecurringSubscription>, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/subscriptions/${id}`, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(update),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async deleteSubscription(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/subscriptions/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async addHardware(hw: HardwareAsset, userId = "default"): Promise<HardwareAsset | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/hardware`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(hw),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async updateHardware(id: string, update: Partial<HardwareAsset>, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/hardware/${id}`, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(update),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async deleteHardware(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/hardware/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async addRevenue(rev: RevenueStream, userId = "default"): Promise<RevenueStream | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/revenues`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(rev),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async updateRevenue(id: string, update: Partial<RevenueStream>, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/revenues/${id}`, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(update),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async deleteRevenue(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/revenues/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async addLiability(liab: LiabilityStream, userId = "default"): Promise<LiabilityStream | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/liabilities`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(liab),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async updateLiability(id: string, update: Partial<LiabilityStream>, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/liabilities/${id}`, {
				method: "PUT",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(update),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async deleteLiability(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/liabilities/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async addTransfer(tx: CapitalTransfer, userId = "default"): Promise<CapitalTransfer | null> {
		try {
			const res = await fetch(`${BIZ_BASE}/transfers`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
				body: JSON.stringify(tx),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},

	async deleteTransfer(id: string, userId = "default"): Promise<boolean> {
		try {
			const res = await fetch(`${BIZ_BASE}/transfers/${id}`, {
				method: "DELETE",
				headers: authHeaders({ "x-user-id": userId }),
			});
			return res.ok;
		} catch {
			return false;
		}
	},

	async getLedger(yearMonth: string, entityId?: string, userId = "default"): Promise<MonthlyLedger | null> {
		try {
			const url = new URL(`${BIZ_BASE}/ledger/${yearMonth}`, window.location.origin);
			if (entityId) url.searchParams.set("entityId", entityId);
			const res = await fetch(url.toString(), {
				headers: authHeaders({ "x-user-id": userId }),
			});
			if (!res.ok) return null;
			return await res.json();
		} catch {
			return null;
		}
	},
};
