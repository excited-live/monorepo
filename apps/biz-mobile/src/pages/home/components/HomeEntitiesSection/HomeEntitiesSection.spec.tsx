import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("HomeEntitiesSection Visual", () => {
	test("renders entities section and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeEntitiesSection", {
			accounts: FIXTURE_ACCOUNTS,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("home-entities-section-default.png");
	});
});
