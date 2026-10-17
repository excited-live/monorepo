import { test, expect } from "@playwright/test";

test.describe("Home Page Visual", () => {
	test("renders home page dashboard and matches screenshot", async ({ mount }) => {
		const component = await mount("Home");
		await expect(component).toHaveScreenshot("home-page-default.png");
	});
});
