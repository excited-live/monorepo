import { test, expect } from "@playwright/test";

test.describe("CapitalHeroCard Component Visual", () => {
	test("renders personal wealth hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("components/CapitalHeroCard/PersonalWealth");
		await expect(component).toHaveScreenshot("capital-hero-card-personal.png");
	});

	test("renders business book value hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("components/CapitalHeroCard/BusinessBookValue");
		await expect(component).toHaveScreenshot("capital-hero-card-business.png");
	});
});
