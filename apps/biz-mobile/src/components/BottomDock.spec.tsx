import { test, expect } from "@playwright/test";

test.describe("BottomDock Component Visual", () => {
	test("renders bottom dock navigation and matches screenshot", async ({ mount }) => {
		const component = await mount("components/BottomDock/HomeActive");
		await expect(component).toHaveScreenshot("bottom-dock-home.png");
	});
});
