import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS, FIXTURE_REVENUES } from "../../../../testing/fixtures";

test.describe("ManagementIncomeSection Visual", () => {
	test("renders income section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementIncomeSection", {
			isPersonal: true,
			activeAccount: FIXTURE_ACCOUNTS[0]!,
			entityRev: FIXTURE_REVENUES,
			totalIncome: 150000,
			hasConfiguredSalary: false,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("management-income-section-default.png");
	});
});
