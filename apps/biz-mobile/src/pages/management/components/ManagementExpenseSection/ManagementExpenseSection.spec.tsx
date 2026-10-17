import { test, expect } from "@playwright/test";
import { FIXTURE_SUBSCRIPTIONS, FIXTURE_TRANSFERS } from "../../../../testing/fixtures";

test.describe("ManagementExpenseSection Visual", () => {
	test("renders expense section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementExpenseSection", {
			isPersonal: true,
			entitySubs: FIXTURE_SUBSCRIPTIONS,
			outgoingTransfers: FIXTURE_TRANSFERS,
			totalMonthlyExpenses: 34500,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("management-expense-section-default.png");
	});
});
