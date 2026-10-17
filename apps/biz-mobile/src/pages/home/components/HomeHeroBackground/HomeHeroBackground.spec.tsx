import { test, expect } from "@playwright/test";

test.describe("HomeHeroBackground Visual", () => {
	test("renders home hero background and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeHeroBackground");
		await expect(component).toHaveScreenshot("home-hero-bg-default.png");
	});
});
