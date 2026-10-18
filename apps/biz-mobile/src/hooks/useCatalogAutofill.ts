import { useState, useEffect, useRef, useCallback } from "react";
import {
	findBestCatalogMatch,
	resolveCatalogAmount,
	searchCatalog,
	type CatalogItem,
} from "@excited-live/accounting";
import { catalogApi } from "../lib/api-client";

export interface TouchedFields {
	amount?: boolean;
	cycle?: boolean;
	category?: boolean;
	imageUrl?: boolean;
}

export interface AutofillValues {
	name?: string;
	amount?: number;
	cycle?: string;
	category?: string;
	imageUrl?: string;
	coverImageUrl?: string;
}

export interface UseCatalogAutofillOptions {
	type?: "subscription" | "hardware" | "career" | "revenue";
	currency?: string;
	debounceMs?: number;
	onApplyAutofill?: (values: AutofillValues, matched: CatalogItem) => void;
}

export function useCatalogAutofill({
	type = "subscription",
	currency = "THB",
	debounceMs = 250,
	onApplyAutofill,
}: UseCatalogAutofillOptions = {}) {
	const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
	const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
	const [matchedItem, setMatchedItem] = useState<CatalogItem | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	const touchedRef = useRef<TouchedFields>(touchedFields);
	touchedRef.current = touchedFields;

	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const markTouched = useCallback((field: keyof TouchedFields) => {
		setTouchedFields((prev) => ({ ...prev, [field]: true }));
	}, []);

	const resetTouched = useCallback(() => {
		setTouchedFields({});
	}, []);

	const applySuggestion = useCallback(
		(item: CatalogItem) => {
			const resolvedAmount = resolveCatalogAmount(item, currency);
			setMatchedItem(item);

			const valuesToApply: AutofillValues = {
				name: item.name,
			};

			if (!touchedRef.current.amount && resolvedAmount !== undefined) {
				valuesToApply.amount = resolvedAmount;
			}
			if (!touchedRef.current.cycle && item.cycle) {
				valuesToApply.cycle = item.cycle;
			}
			if (!touchedRef.current.category && item.category) {
				valuesToApply.category = item.category;
			}
			if (!touchedRef.current.imageUrl) {
				valuesToApply.imageUrl = item.imageUrl;
				if (item.coverImageUrl) {
					valuesToApply.coverImageUrl = item.coverImageUrl;
				}
			}

			if (onApplyAutofill) {
				onApplyAutofill(valuesToApply, item);
			}
		},
		[currency, onApplyAutofill],
	);

	const handleQueryChange = useCallback(
		(query: string, currentValues?: { amount?: number | string; cycle?: string; category?: string; imageUrl?: string }) => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}

			const trimmed = query.trim();
			if (!trimmed || trimmed.length < 2) {
				setSuggestions([]);
				setMatchedItem(null);
				setIsSearching(false);
				return;
			}

			setIsSearching(true);

			debounceTimer.current = setTimeout(async () => {
				try {
					// 1. First, attempt backend smart resolve
					const resp = await catalogApi.resolve({
						query: trimmed,
						currency,
						type,
						touchedFields: touchedRef.current,
						currentValues,
					});

					setSuggestions(resp.suggestions || []);
					if (resp.match) {
						setMatchedItem(resp.match);
						if (onApplyAutofill) {
							onApplyAutofill(resp.autofill, resp.match);
						}
					} else if (resp.autofill.imageUrl && !touchedRef.current.imageUrl) {
						// Dynamic domain favicon match
						if (onApplyAutofill) {
							onApplyAutofill({ imageUrl: resp.autofill.imageUrl }, {
								id: `domain_${trimmed}`,
								name: trimmed,
								aliases: [],
								type: type || "subscription",
								category: "general",
								defaultAmounts: {},
								imageUrl: resp.autofill.imageUrl,
							});
						}
					} else {
						setMatchedItem(null);
					}
				} catch {
					// 2. Offline / local fallback to pure @excited-live/accounting catalog
					const localSuggestions = searchCatalog(trimmed, type);
					setSuggestions(localSuggestions);

					const localBest = findBestCatalogMatch(trimmed, type);
					if (localBest) {
						setMatchedItem(localBest);
						const resolvedAmount = resolveCatalogAmount(localBest, currency);
						const fallbackAutofill: AutofillValues = {};
						if (!touchedRef.current.amount && resolvedAmount !== undefined) {
							fallbackAutofill.amount = resolvedAmount;
						}
						if (!touchedRef.current.cycle && localBest.cycle) {
							fallbackAutofill.cycle = localBest.cycle;
						}
						if (!touchedRef.current.category && localBest.category) {
							fallbackAutofill.category = localBest.category;
						}
						if (!touchedRef.current.imageUrl) {
							fallbackAutofill.imageUrl = localBest.imageUrl;
							if (localBest.coverImageUrl) {
								fallbackAutofill.coverImageUrl = localBest.coverImageUrl;
							}
						}
						if (onApplyAutofill) {
							onApplyAutofill(fallbackAutofill, localBest);
						}
					} else {
						setMatchedItem(null);
					}
				} finally {
					setIsSearching(false);
				}
			}, debounceMs);
		},
		[currency, debounceMs, onApplyAutofill, type],
	);

	useEffect(() => {
		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current);
			}
		};
	}, []);

	return {
		touchedFields,
		markTouched,
		resetTouched,
		suggestions,
		matchedItem,
		applySuggestion,
		handleQueryChange,
		isSearching,
	};
}
