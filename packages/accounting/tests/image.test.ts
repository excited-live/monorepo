import { describe, expect, it } from "vitest";
import { CATALOG_PRESETS, resolveFaviconUrl } from "../src/catalog";
import { pickSuggestedImage } from "../src/image";

const figma = CATALOG_PRESETS.find((item) => item.id === "tool_figma")!;
const make = CATALOG_PRESETS.find((item) => item.id === "tool_make")!;
const ipadPro = CATALOG_PRESETS.find((item) => item.id === "gear_ipad_pro")!;
const agoda = CATALOG_PRESETS.find((item) => item.id === "company_agoda")!;

describe("pickSuggestedImage", () => {
	it("uses the catalog image for an exact preset name", () => {
		expect(pickSuggestedImage("Figma Professional", { kind: "expense" })).toBe(figma.imageUrl);
	});

	it("uses the catalog image for an alias", () => {
		expect(pickSuggestedImage("figma", { kind: "expense" })).toBe(figma.imageUrl);
	});

	it("uses the catalog image when the name starts with a preset", () => {
		expect(pickSuggestedImage("Figma Professional Team", { kind: "expense" })).toBe(figma.imageUrl);
	});

	it("ignores names that only contain a preset as a substring", () => {
		expect(pickSuggestedImage("Professional Figma plan", { kind: "expense" })).toBeUndefined();
		expect(pickSuggestedImage("Pro Savings", { kind: "expense" })).toBeUndefined();
	});

	it("does not prefix-match a generic alias", () => {
		expect(pickSuggestedImage("Tablet Samsung", { kind: "asset", assetKind: "fixed" })).toBeUndefined();
		expect(pickSuggestedImage("Make coffee", { kind: "expense" })).toBeUndefined();
	});

	it("still matches an exact alias", () => {
		expect(pickSuggestedImage("tablet", { kind: "asset", assetKind: "fixed" })).toBe(ipadPro.imageUrl);
		expect(pickSuggestedImage("make", { kind: "expense" })).toBe(make.imageUrl);
	});

	it("falls back to the favicon of a domain written in the name", () => {
		expect(pickSuggestedImage("acme.dev hosting", { kind: "expense" })).toBe(resolveFaviconUrl("acme.dev"));
	});

	it("still resolves a domain whose label before the TLD has a letter", () => {
		expect(pickSuggestedImage("1password.com", { kind: "business" })).toBe(resolveFaviconUrl("1password.com"));
		expect(pickSuggestedImage("shop.co.th", { kind: "business" })).toBe(resolveFaviconUrl("shop.co.th"));
	});

	it("does not treat a numeric label as a domain", () => {
		expect(pickSuggestedImage("Dell Monitor 27.in", { kind: "expense" })).toBeUndefined();
		expect(pickSuggestedImage("16.gb", { kind: "expense" })).toBeUndefined();
		expect(pickSuggestedImage("3.br", { kind: "expense" })).toBeUndefined();
		expect(pickSuggestedImage("v2.5", { kind: "expense" })).toBeUndefined();
	});

	it("uses the career cover image for employment income", () => {
		expect(pickSuggestedImage("Agoda", { kind: "income", incomeKind: "employment" })).toBe(agoda.coverImageUrl);
	});

	it("maps fixed assets, other income and liabilities to their catalog types", () => {
		const macbook = CATALOG_PRESETS.find((item) => item.id === "gear_macbook_pro")!;
		const stripe = CATALOG_PRESETS.find((item) => item.id === "rev_stripe")!;
		const mortgage = CATALOG_PRESETS.find((item) => item.id === "liab_mortgage")!;

		expect(pickSuggestedImage("MacBook Pro", { kind: "asset", assetKind: "fixed" })).toBe(macbook.imageUrl);
		expect(pickSuggestedImage("Stripe Payout", { kind: "income", incomeKind: "business" })).toBe(stripe.imageUrl);
		expect(pickSuggestedImage("Home Mortgage", { kind: "liability" })).toBe(mortgage.imageUrl);
	});

	it("leaves a business without a catalog or domain match imageless", () => {
		expect(pickSuggestedImage("My Shop", { kind: "business" })).toBeUndefined();
	});

	it("falls back to the favicon for a cash asset with a domain", () => {
		expect(pickSuggestedImage("figma.com wallet", { kind: "asset", assetKind: "cash" })).toBe(
			resolveFaviconUrl("figma.com"),
		);
	});
});
