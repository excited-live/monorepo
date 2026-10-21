import type { UserOnboarding } from "@excited-live/api/client";
import { getApiBaseUrl } from "../http/base-url";
import { tokenStore } from "../auth/token.store";

const getHeaders = (): Record<string, string> => {
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	const token = tokenStore.getToken();
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
};

const getOnboardingBase = (): string => `${getApiBaseUrl()}/api/v1/onboarding`;

export interface UpdateOnboardingPayload {
	appId?: string;
	isCompleted?: boolean;
	done?: string[];
	skipped?: string[];
}

export const onboardingApi = {
	async get(appId = "biz-mobile"): Promise<UserOnboarding> {
		const res = await fetch(`${getOnboardingBase()}?app=${encodeURIComponent(appId)}`, {
			headers: getHeaders(),
		});
		if (!res.ok) throw new Error(`Get onboarding failed HTTP ${res.status}`);
		return res.json();
	},

	async save(payload: UpdateOnboardingPayload): Promise<UserOnboarding> {
		const res = await fetch(getOnboardingBase(), {
			method: "PUT",
			headers: getHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Save onboarding failed HTTP ${res.status}`);
		const body = (await res.json()) as { ok: boolean; data: UserOnboarding };
		return body.data;
	},
};
