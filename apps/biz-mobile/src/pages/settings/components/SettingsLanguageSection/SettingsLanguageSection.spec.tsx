import { test, expect } from "@playwright/test";

test.describe("SettingsLanguageSection Visual", () => {
	test("renders language section and matches screenshot", async ({ mount }) => {
		const component = await mount("SettingsLanguageSection", {
			lang: "en",
		});
		await expect(component).toHaveScreenshot("settings-language-section-default.png");
	});
});
