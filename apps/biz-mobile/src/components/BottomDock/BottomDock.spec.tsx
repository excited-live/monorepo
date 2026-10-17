import { test, expect } from "@playwright/test";

test.describe("BottomDock Component Visual", () => {
	test("renders bottom dock navigation and matches screenshot", async ({ mount }) => {
		const component = await mount("BottomDock");
		await expect(component).toHaveScreenshot("bottom-dock-home.png");
	});
});
