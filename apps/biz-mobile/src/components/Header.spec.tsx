import { test, expect } from "@playwright/test";

test.describe("Header Component Visual", () => {
	test("renders default mobile header and matches screenshot", async ({ mount }) => {
		const component = await mount("components/Header/Default");
		await expect(component).toHaveScreenshot("header-default.png");
	});

	test("renders scrolled mobile header and matches screenshot", async ({ mount }) => {
		const component = await mount("components/Header/Scrolled");
		await expect(component).toHaveScreenshot("header-scrolled.png");
	});
});
