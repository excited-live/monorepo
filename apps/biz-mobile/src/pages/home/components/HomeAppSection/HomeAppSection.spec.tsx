import { test, expect } from "@playwright/test";

test.describe("HomeAppSection Visual", () => {
	test("renders home app section sheet and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeAppSection");
		await expect(component).toHaveScreenshot("home-app-section-default.png");
	});
});
