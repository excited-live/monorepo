import { test, expect } from "@playwright/test";

test.describe("Header Component Visual", () => {
	test("renders default mobile header and matches screenshot", async ({ mount }) => {
		const component = await mount("Header");
		await expect(component).toHaveScreenshot("header-default.png");
	});
});
