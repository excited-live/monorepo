import { getApiBaseUrl } from "../http/base-url";
import { tokenStore } from "./token.store";

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

const getApiRoot = (): string => `${getApiBaseUrl()}/api/v1`;

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
	const headers: Record<string, string> = { ...extra };
	const token = tokenStore.getToken();
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

async function authErrorMessage(res: Response): Promise<string | null> {
	try {
		const body = (await res.json()) as { message?: string; error?: string };
		return body.message || body.error || null;
	} catch {
		return null;
	}
}

export const authApi = {
	async signInEmail(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
		const cleanEmail = email.trim();
		const res = await fetch(`${getApiRoot()}/auth/sign-in/email`, {
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
		tokenStore.setToken(token);
		const user = data?.user ?? (await authApi.me());
		if (!user) {
			throw new Error("Sign-in succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async signUpEmail(email: string, password: string, name: string): Promise<{ token: string; user: AuthUser }> {
		const cleanEmail = email.trim();
		const res = await fetch(`${getApiRoot()}/auth/sign-up/email`, {
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
		tokenStore.setToken(token);
		const user = data?.user ?? (await authApi.me());
		if (!user) {
			throw new Error("Sign-up succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async signInWithGoogleIdToken(idToken: string): Promise<{ token: string; user: AuthUser }> {
		const res = await fetch(`${getApiRoot()}/auth/sign-in/social`, {
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
		tokenStore.setToken(token);
		const user = await authApi.me();
		if (!user) {
			throw new Error("Google sign-in succeeded but the session could not be resolved");
		}
		return { token, user };
	},

	async me(): Promise<AuthUser | null> {
		if (!tokenStore.getToken()) return null;
		try {
			const res = await fetch(`${getApiRoot()}/auth/me`, {
				headers: authHeaders(),
			});
			if (!res.ok) {
				if (res.status === 401) {
					tokenStore.clearToken();
				}
				return null;
			}
			const data = (await res.json()) as { user?: AuthUser };
			return data.user ?? null;
		} catch {
			return null;
		}
	},

	async signOut(): Promise<void> {
		try {
			if (tokenStore.getToken()) {
				await fetch(`${getApiRoot()}/auth/sign-out`, {
					method: "POST",
					headers: authHeaders({ "content-type": "application/json" }),
					body: JSON.stringify({}),
				});
			}
		} catch {
			// best effort
		} finally {
			tokenStore.clearToken();
		}
	},
};
