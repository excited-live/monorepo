import { Hono } from "hono";
import {
	findBestCatalogMatch,
	resolveCatalogAmount,
	resolveFaviconUrl,
	searchCatalog,
	type CatalogItem,
} from "@excited-live/biz";
import type { ApiEnv } from "../lib/env";

export interface ResolveAutofillRequest {
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

export interface ResolveAutofillResponse {
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

export function createCatalogRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	// GET /suggest?q=opencode&currency=THB&type=subscription
	router.get("/suggest", (c) => {
		const q = c.req.query("q") || "";
		const currency = c.req.query("currency") || "THB";
		const type = c.req.query("type") as "subscription" | "hardware" | "career" | "revenue" | undefined;

		const suggestions = searchCatalog(q, type);
		const bestMatch = findBestCatalogMatch(q, type);

		let fallbackFavicon: string | null = null;
		if (!bestMatch && q.trim().length > 1) {
			const clean = q.trim();
			if (clean.includes(".") || !clean.includes(" ")) {
				fallbackFavicon = resolveFaviconUrl(clean);
			}
		}

		return c.json({
			query: q,
			currency,
			bestMatch: bestMatch
				? {
						...bestMatch,
						amount: resolveCatalogAmount(bestMatch, currency),
					}
				: null,
			suggestions: suggestions.map((item) => ({
				...item,
				amount: resolveCatalogAmount(item, currency),
			})),
			fallbackFavicon,
		});
	});

	// POST /resolve — Smart resolver respecting user's touched fields
	router.post("/resolve", async (c) => {
		const body = await c.req.json<ResolveAutofillRequest>();
		const query = body.query || "";
		const currency = body.currency || "THB";
		const type = body.type;
		const touched = body.touchedFields || {};
		const current = body.currentValues || {};

		const bestMatch = findBestCatalogMatch(query, type);
		const suggestions = searchCatalog(query, type);

		const autofill: ResolveAutofillResponse["autofill"] = {};

		if (bestMatch) {
			// Name suggestion if user hasn't typed full official name
			autofill.name = bestMatch.name;

			// Auto-fill amount only if NOT touched
			if (!touched.amount) {
				const resolvedAmount = resolveCatalogAmount(bestMatch, currency);
				if (resolvedAmount !== undefined) {
					autofill.amount = resolvedAmount;
				}
			}

			// Auto-fill cycle only if NOT touched
			if (!touched.cycle && bestMatch.cycle) {
				autofill.cycle = bestMatch.cycle;
			}

			// Auto-fill category only if NOT touched
			if (!touched.category && bestMatch.category) {
				autofill.category = bestMatch.category;
			}

			// Auto-fill image only if NOT touched
			if (!touched.imageUrl && bestMatch.imageUrl) {
				autofill.imageUrl = bestMatch.imageUrl;
			}

			if (bestMatch.coverImageUrl) {
				autofill.coverImageUrl = bestMatch.coverImageUrl;
			}

			return c.json<ResolveAutofillResponse>({
				match: bestMatch,
				suggestions,
				autofill,
				source: "preset",
			});
		}

		// Fallback for unlisted tools with a domain name
		if (query.trim().length > 1 && (query.includes(".") || !query.includes(" "))) {
			const favicon = resolveFaviconUrl(query);
			if (!touched.imageUrl && !current.imageUrl) {
				autofill.imageUrl = favicon;
			}
			return c.json<ResolveAutofillResponse>({
				match: null,
				suggestions: [],
				autofill,
				source: "dynamic_domain",
			});
		}

		return c.json<ResolveAutofillResponse>({
			match: null,
			suggestions: [],
			autofill: {},
			source: "none",
		});
	});

	return router;
}
