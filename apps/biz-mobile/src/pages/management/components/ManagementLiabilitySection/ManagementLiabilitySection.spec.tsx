import { test, expect } from "@playwright/test";
import { FIXTURE_LIABILITIES } from "../../../../testing/fixtures";

test.describe("ManagementLiabilitySection Visual", () => {
	test("renders liability section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementLiabilitySection", {
			entityLiab: FIXTURE_LIABILITIES,
			totalMonthlyLiabilities: 18000,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("management-liability-section-default.png");
	});
});
