import { useQuery } from "@tanstack/react-query";
import { catalogApi, type CatalogSuggestResponse } from "./catalog.api";

export const catalogKeys = {
	all: ["catalog"] as const,
	suggest: (query: string, currency: string, type?: string) =>
		[...catalogKeys.all, "suggest", query, currency, type ?? "all"] as const,
};

export function useCatalogSuggest(query: string, currency = "THB", type?: string) {
	return useQuery<CatalogSuggestResponse, Error>({
		queryKey: catalogKeys.suggest(query, currency, type),
		queryFn: () => catalogApi.suggest(query, currency, type),
		enabled: query.trim().length >= 2,
		staleTime: 1000 * 60 * 30, // 30 minutes
	});
}
