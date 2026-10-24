import { findStrictCatalogMatch, resolveFaviconUrl, type CatalogItem } from "./catalog";

export type ImageSubject =
	| { kind: "business" }
	| { kind: "asset"; assetKind: "cash" | "fixed" | "investment" }
	| { kind: "income"; incomeKind: "employment" | "business" | "investment" | "other" }
	| { kind: "expense" }
	| { kind: "liability" };

/** Catalog type to search for a subject; undefined means no catalog lookup. */
function catalogTypeOf(subject: ImageSubject): CatalogItem["type"] | undefined {
	switch (subject.kind) {
		case "business":
			return undefined;
		case "asset":
			return subject.assetKind === "fixed" ? "hardware" : undefined;
		case "income":
			return subject.incomeKind === "employment" ? "career" : "revenue";
		case "expense":
			return "subscription";
		case "liability":
			return "liability";
	}
}

/**
 * A domain-shaped token. The label right before the TLD must contain a letter,
 * so "27.in" and "16.gb" in a name are not mistaken for domains.
 */
const DOMAIN = /\b(?:[a-z0-9-]+\.)*[a-z0-9-]*[a-z][a-z0-9-]*\.[a-z]{2,}\b/i;

/**
 * Picks an image for a record created over MCP, or undefined to let the app draw
 * its generated per-kind tile.
 *
 * The catalog match is strict on purpose: a wrong logo is worse than the app's
 * generated tile, which the user can replace later in the app.
 */
export function pickSuggestedImage(name: string, subject: ImageSubject): string | undefined {
	const type = catalogTypeOf(subject);
	if (type) {
		const match = findStrictCatalogMatch(name, type);
		if (match) return type === "career" ? (match.coverImageUrl ?? match.imageUrl) : match.imageUrl;
	}

	const domain = name.match(DOMAIN)?.[0];
	return domain ? resolveFaviconUrl(domain) : undefined;
}
