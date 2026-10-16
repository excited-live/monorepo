import { test, expect } from "@playwright/test";

test.describe("LedgerHeroCard Component Visual", () => {
	test("renders cashflow projection chart and matches screenshot", async ({ mount }) => {
		const component = await mount("components/LedgerHeroCard/Default");
		await expect(component).toHaveScreenshot("ledger-hero-card-default.png");
	});
});
