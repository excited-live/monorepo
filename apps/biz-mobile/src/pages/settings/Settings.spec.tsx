import { test, expect } from "@playwright/test";

test.describe("Settings Page Visual", () => {
	test("renders settings page and matches screenshot", async ({ mount }) => {
		const component = await mount("Settings");
		await expect(component).toHaveScreenshot("settings-page-default.png");
	});
});
