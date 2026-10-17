import { test, expect } from "@playwright/test";

test.describe("SettingsDataPortabilitySection Visual", () => {
	test("renders data portability section and matches screenshot", async ({ mount }) => {
		const component = await mount("SettingsDataPortabilitySection");
		await expect(component).toHaveScreenshot("settings-data-portability-section-default.png");
	});
});
