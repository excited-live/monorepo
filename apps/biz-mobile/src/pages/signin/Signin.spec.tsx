import { test, expect } from "@playwright/test";

test.describe("Signin Page Visual", () => {
	test("renders signin page and matches screenshot", async ({ mount }) => {
		const component = await mount("Signin");
		await expect(component).toHaveScreenshot("signin-page-default.png");
	});
});
