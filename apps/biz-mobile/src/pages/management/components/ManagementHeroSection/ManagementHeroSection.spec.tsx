import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("ManagementHeroSection Visual", () => {
	test("renders hero carousel section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementHeroSection", {
			accounts: FIXTURE_ACCOUNTS,
			activeEntityId: FIXTURE_ACCOUNTS[0]!.id,
			activeAccount: FIXTURE_ACCOUNTS[0]!,
		});
		await expect(component).toHaveScreenshot("management-hero-section-default.png");
	});
});
