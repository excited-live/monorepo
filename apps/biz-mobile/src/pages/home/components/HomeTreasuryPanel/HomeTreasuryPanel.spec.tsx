import { test, expect } from "@playwright/test";

test.describe("HomeTreasuryPanel Visual", () => {
	test("renders treasury panel and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeTreasuryPanel", {
			totalTreasury: 2850000,
			totalEomTreasury: 2920000,
			personalCash: 1500000,
			businessCash: 1350000,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("home-treasury-panel-default.png");
	});

	test("renders treasury panel in Thai and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeTreasuryPanel", {
			totalTreasury: 2850000,
			totalEomTreasury: 2920000,
			personalCash: 1500000,
			businessCash: 1350000,
			lang: "th",
		});
		await expect(component).toHaveScreenshot("home-treasury-panel-th.png");
	});
});
