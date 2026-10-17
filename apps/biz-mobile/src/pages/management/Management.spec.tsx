import { test, expect } from "@playwright/test";

test.describe("Management Page Visual", () => {
	test("renders management page dashboard and matches screenshot", async ({ mount }) => {
		const component = await mount("Management");
		await expect(component).toHaveScreenshot("management-page-default.png");
	});
});
