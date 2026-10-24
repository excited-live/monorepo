import { describe, expect, it } from "vitest";
import {
	findBestCatalogMatch,
	findStrictCatalogMatch,
	resolveCatalogAmount,
	resolveFaviconUrl,
	searchCatalog,
} from "../src/catalog";

describe("catalog", () => {
	it("resolves favicon url correctly", () => {
		expect(resolveFaviconUrl("openai.com")).toContain("google.com/s2/favicons");
		expect(resolveFaviconUrl("https://anthropic.com/")).toContain("domain=anthropic.com");
	});

	it("matches opencode and retrieves price and image", () => {
		const match = findBestCatalogMatch("opencode");
		expect(match).not.toBeNull();
		expect(match?.name).toBe("Opencode Go");
		expect(match?.category).toBe("dev_tool");
		expect(match?.defaultAmounts.THB).toBe(360);
		expect(match?.defaultAmounts.USD).toBe(10);
		expect(match?.imageUrl).toContain("unsplash");
	});

	it("matches famous Thai tech companies like Agoda and LINE MAN", () => {
		const agoda = findBestCatalogMatch("agoda");
		expect(agoda).not.toBeNull();
		expect(agoda?.name).toBe("Agoda");
		expect(agoda?.type).toBe("career");
		expect(agoda?.coverImageUrl).toBeDefined();

		const lineman = findBestCatalogMatch("lineman");
		expect(lineman).not.toBeNull();
		expect(lineman?.name).toBe("LINE MAN Wongnai");
	});

	it("converts amounts correctly based on target currency", () => {
		const opencode = findBestCatalogMatch("opencode")!;
		expect(resolveCatalogAmount(opencode, "THB")).toBe(360);
		expect(resolveCatalogAmount(opencode, "USD")).toBe(10);

		// An item that only specifies THB converts dynamically to USD
		const bts = findBestCatalogMatch("bts")!;
		expect(resolveCatalogAmount(bts, "THB")).toBe(1400);
		expect(resolveCatalogAmount(bts, "USD")).toBe(40);
	});

	it("filters by type", () => {
		const careerMatches = searchCatalog("agoda", "career");
		expect(careerMatches.length).toBeGreaterThan(0);

		const subMatches = searchCatalog("agoda", "subscription");
		expect(subMatches.length).toBe(0);
	});

	it("matches work gear, revenue sources and liabilities by type", () => {
		const macbook = findBestCatalogMatch("macbook", "hardware");
		expect(macbook?.name).toBe("MacBook Pro 14\"");
		expect(macbook?.category).toBe("workstation");

		const audio = searchCatalog("airpods", "hardware");
		expect(audio.some((item) => item.category === "audio")).toBe(true);

		const stripe = findBestCatalogMatch("stripe", "revenue");
		expect(stripe?.name).toBe("Stripe Payout");
		expect(stripe?.category).toBe("stripe");

		const mortgage = findBestCatalogMatch("mortgage", "liability");
		expect(mortgage?.name).toBe("Home Mortgage");
		expect(mortgage?.category).toBe("mortgage");
		expect(findBestCatalogMatch("mortgage", "subscription")).toBeNull();
	});

	it("strictly matches exact names, aliases and word-boundary prefixes only", () => {
		expect(findStrictCatalogMatch("Figma Professional", "subscription")?.id).toBe("tool_figma");
		expect(findStrictCatalogMatch("figma", "subscription")?.id).toBe("tool_figma");
		expect(findStrictCatalogMatch("Figma Professional Team", "subscription")?.id).toBe("tool_figma");
		expect(findStrictCatalogMatch("Figmac", "subscription")).toBeNull();
		expect(findStrictCatalogMatch("figmaer", "subscription")).toBeNull();
		expect(findStrictCatalogMatch("Professional Figma", "subscription")).toBeNull();
		expect(findStrictCatalogMatch("Pro Savings", "subscription")).toBeNull();
		expect(findStrictCatalogMatch("figma", "career")).toBeNull();
	});

	it("never prefix-matches an alias", () => {
		expect(findStrictCatalogMatch("Tablet Samsung", "hardware")).toBeNull();
		expect(findStrictCatalogMatch("tablet", "hardware")?.id).toBe("gear_ipad_pro");
		expect(findStrictCatalogMatch("Make coffee", "subscription")).toBeNull();
		expect(findStrictCatalogMatch("make", "subscription")?.id).toBe("tool_make");
		expect(findStrictCatalogMatch("Personal loan from friend", "liability")).toBeNull();
	});

	it("prefers the longest matching name", () => {
		expect(findStrictCatalogMatch("GitHub Copilot monthly", "subscription")?.id).toBe("tool_copilot");
	});
});
