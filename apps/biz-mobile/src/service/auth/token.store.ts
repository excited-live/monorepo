const TOKEN_KEY = "biz_auth_token";

let inMemoryToken: string | null = null;

export const tokenStore = {
	getToken(): string | null {
		if (inMemoryToken) return inMemoryToken;
		try {
			if (typeof localStorage !== "undefined") {
				inMemoryToken = localStorage.getItem(TOKEN_KEY);
			}
		} catch {
			// ignore local storage errors
		}
		return inMemoryToken;
	},

	setToken(token: string | null): void {
		inMemoryToken = token;
		try {
			if (typeof localStorage !== "undefined") {
				if (token) {
					localStorage.setItem(TOKEN_KEY, token);
				} else {
					localStorage.removeItem(TOKEN_KEY);
				}
			}
		} catch {
			// ignore local storage errors
		}
	},

	clearToken(): void {
		this.setToken(null);
	},
};

export const getAuthToken = (): string | null => tokenStore.getToken();
export const setAuthToken = (token: string | null): void => tokenStore.setToken(token);
