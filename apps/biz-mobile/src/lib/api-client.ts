import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";

export interface BizSnapshot {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	updatedAt?: string;
}

export interface AuthUser {
	id: string;
	email: string;
	name: string;
}

// Same-origin by default: vite dev/preview proxy /api to the API server (see
// vite.config.ts) — this keeps auth headers on a single origin locally. For
// device builds set VITE_API_URL to the absolute API origin instead.
const API_ROOT = import.meta.env.VITE_API_URL || "/api/v1";
const BIZ_BASE = `${API_ROOT}/biz`;

/**
 * Bearer token for the signed-in session (Better Auth tokens mount on the
 * API). Null in guest/offline mode. Set by the auth state on sign-in, restore,
 * and sign-out; every request then carries it. The x-user-id header stays as
 * the guest bucket while auth is unconfigured on the API (dev/prelive).
 */
let bearerToken: string | null = null;

export function setBearerToken(token: string | null): void {
	bearerToken = token;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return bearerToken ? { ...extra, Authorization: `Bearer ${bearerToken}` } : extra;
}

/**
 * Sign in with email + password against the Better Auth mount. The request
 * carries an `Authorization: Bearer` header so the bearer() plugin returns the
 * session token in the `set-auth-token` response header — no browser, no deep
 * link, fully in-app.
 */
export const authApi = {
	async signIn(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
		const res = await fetch(`${API_ROOT}/auth/sign-in/email`, {
			method: "POST",
			headers: { "content-type": "application/json", Authorization: "Bearer" },
			body: JSON.stringify({ email, password }),
		});
		if (!res.ok) {
			throw new Error((await authErrorMessage(res)) || "Sign-in failed");
		}
		const data = (await res.json().catch(() => null)) as { token?: string } | null;
		// The token comes in the response body; the set-auth-token header is the
		// bearer() plugin's alternative — body-first because some environments
		// strip non-safelisted response headers cross-origin.
		const token = data?.token ?? res.headers.get("set-auth-token");
		if (!token) {
			throw new Error("Sign-in did not return a session token");
		}
		setBearerToken(token);
		const user = await authApi.me();
		if (!user) {
			throw new Error("Sign-in succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	/**
	 * Google sign-in for native builds: the Google Sign-In SDK (via the Tauri
	 * plugin) returns an ID token for the web client ID, which Better Auth
	 * verifies server-side through the `sign-in/social` idToken branch. The
	 * bearer() plugin then issues the same session token as email sign-in.
	 */
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

	/** Resolve the profile for the current bearer token; null when invalid/expired. */
	async me(): Promise<AuthUser | null> {
		if (!bearerToken) return null;
		const res = await fetch(`${API_ROOT}/auth/me`, authHeaders());
		if (!res.ok) return null;
		const data = (await res.json()) as { user?: AuthUser };
		return data.user ?? null;
	},

	/** Revoke the session server-side (best effort; local state clears regardless). */
	async signOut(): Promise<void> {
		if (!bearerToken) return;
		try {
			await fetch(`${API_ROOT}/auth/sign-out`, {
				method: "POST",
				headers: authHeaders({ "content-type": "application/json" }),
				body: JSON.stringify({}),
			});
		} catch {
			// best effort
		}
	},
};

async function authErrorMessage(res: Response): Promise<string> {
	try {
		const body = (await res.json()) as { message?: string; error?: string };
		return body.message || body.error || "";
	} catch {
		return "";
	}
}

export const bizApi = {
	async getSnapshot(userId = "default"): Promise<BizSnapshot> {
		const res = await fetch(`${BIZ_BASE}`, {
			headers: authHeaders({ "x-user-id": userId }),
		});
		if (!res.ok) throw new Error(`Failed to fetch snapshot: ${res.statusText}`);
		return res.json();
	},

	async syncSnapshot(data: BizSnapshot, userId = "default"): Promise<void> {
		const res = await fetch(`${BIZ_BASE}`, {
			method: "PUT",
			headers: authHeaders({
				"content-type": "application/json",
				"x-user-id": userId,
			}),
			body: JSON.stringify(data),
		});
		if (!res.ok) throw new Error(`Failed to sync snapshot: ${res.statusText}`);
	},

	async addAccount(account: EntityAccount, userId = "default"): Promise<EntityAccount> {
		const res = await fetch(`${BIZ_BASE}/accounts`, {
			method: "POST",
			headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
			body: JSON.stringify(account),
		});
		return res.json();
	},

	async addSubscription(sub: RecurringSubscription, userId = "default"): Promise<RecurringSubscription> {
		const res = await fetch(`${BIZ_BASE}/subscriptions`, {
			method: "POST",
			headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
			body: JSON.stringify(sub),
		});
		return res.json();
	},

	async addHardware(hw: HardwareAsset, userId = "default"): Promise<HardwareAsset> {
		const res = await fetch(`${BIZ_BASE}/hardware`, {
			method: "POST",
			headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
			body: JSON.stringify(hw),
		});
		return res.json();
	},

	async addRevenue(rev: RevenueStream, userId = "default"): Promise<RevenueStream> {
		const res = await fetch(`${BIZ_BASE}/revenues`, {
			method: "POST",
			headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
			body: JSON.stringify(rev),
		});
		return res.json();
	},

	async addTransfer(tx: CapitalTransfer, userId = "default"): Promise<CapitalTransfer> {
		const res = await fetch(`${BIZ_BASE}/transfers`, {
			method: "POST",
			headers: authHeaders({ "content-type": "application/json", "x-user-id": userId }),
			body: JSON.stringify(tx),
		});
		return res.json();
	},
};
