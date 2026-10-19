import { describe, expect, it } from "vitest";
import {
	findBestCatalogMatch,
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
});
