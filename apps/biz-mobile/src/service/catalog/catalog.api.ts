import type { CatalogItem } from "@excited-live/accounting";
import { getApiBaseUrl } from "../http/base-url";

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

const getCatalogBase = (): string => `${getApiBaseUrl()}/api/v1/catalog`;

export const catalogApi = {
	async suggest(query: string, currency = "THB", type?: string): Promise<CatalogSuggestResponse> {
		const params = new URLSearchParams({ q: query, currency });
		if (type) params.set("type", type);
		const res = await fetch(`${getCatalogBase()}/suggest?${params.toString()}`);
		if (!res.ok) throw new Error(`Suggest failed HTTP ${res.status}`);
		return res.json();
	},

	async resolve(payload: CatalogResolveRequest): Promise<CatalogResolveResponse> {
		const res = await fetch(`${getCatalogBase()}/resolve`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Resolve failed HTTP ${res.status}`);
		return res.json();
	},
};
