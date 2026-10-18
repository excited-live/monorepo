import { hc } from "hono/client";
import type { AccountingRouter, AppType } from "@excited-live/api/client";
import { getApiBaseUrl } from "./base-url";
import { tokenStore } from "../auth/token.store";

const getHeaders = () => {
	const headers: Record<string, string> = {};
	const token = tokenStore.getToken();
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
};

export const accountingClient = hc<AccountingRouter>(`${getApiBaseUrl()}/api/v1/accounting`, {
	headers: getHeaders,
});

export const apiClient = hc<AppType>(getApiBaseUrl(), {
	headers: getHeaders,
});

export type ApiClient = typeof apiClient;
export type AccountingClient = typeof accountingClient;
