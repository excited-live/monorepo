import { Hono } from "hono";
import {
	findBestCatalogMatch,
	resolveCatalogAmount,
	resolveFaviconUrl,
	searchCatalog,
	type CatalogItem,
} from "@excited-live/biz";
import type { ApiEnv } from "../lib/env";
import { jsonBody, jsonResponse, route } from "../openapi/docs";
import { CatalogItemSchema } from "../openapi/schemas";
import { z } from "zod";

const catalogType = z.enum(["subscription", "hardware", "career", "revenue"]);

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
	router.get("/suggest", route({
		tags: ["Catalog"],
		operationId: "suggestCatalog",
		summary: "Search the catalog",
		parameters: [
			{ name: "q", in: "query", required: false, description: "Search text (name, alias or domain).", schema: { type: "string" } },
			{ name: "currency", in: "query", required: false, description: "Defaults to `THB`.", schema: { type: "string" } },
			{ name: "type", in: "query", required: false, schema: { type: "string", enum: catalogType.options } },
		],
		responses: {
			200: jsonResponse("Best match, suggestions and a favicon fallback.", z.object({
				query: z.string(),
				currency: z.string(),
				bestMatch: CatalogItemSchema.nullable(),
				suggestions: z.array(CatalogItemSchema),
				fallbackFavicon: z.string().nullable(),
			})),
		},
	}), (c) => {
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
	router.post("/resolve", route({
		tags: ["Catalog"],
		operationId: "resolveCatalogAutofill",
		summary: "Resolve autofill values",
		description: "Smart resolver that skips fields the user already touched.",
		requestBody: jsonBody(z.object({
			query: z.string(),
			currency: z.string().optional(),
			type: catalogType.optional(),
			touchedFields: z.object({ amount: z.boolean(), cycle: z.boolean(), category: z.boolean(), imageUrl: z.boolean() }).partial().optional(),
			currentValues: z.object({ amount: z.union([z.number(), z.string()]), cycle: z.string(), category: z.string(), imageUrl: z.string() }).partial().optional(),
		})),
		responses: {
			200: jsonResponse("Autofill values.", z.object({
				match: CatalogItemSchema.nullable(),
				suggestions: z.array(CatalogItemSchema),
				autofill: z.object({ name: z.string(), amount: z.number(), cycle: z.string(), category: z.string(), imageUrl: z.string(), coverImageUrl: z.string() }).partial(),
				source: z.enum(["preset", "dynamic_domain", "none"]),
			})),
		},
	}), async (c) => {
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
