import { test, expect } from "@playwright/test"

test.describe("GroupedPeriodTable Component Visual", () => {
	test("renders collapsed income groups and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedPeriodTable/IncomeGroups",
		)
		await expect(component).toHaveScreenshot("grouped-period-income-groups.png")
	})

	test("renders collapsed expense groups and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedPeriodTable/ExpenseGroups",
		)
		await expect(component).toHaveScreenshot("grouped-period-expense-groups.png")
	})

	test("renders Thai income groups and matches screenshot", async ({ mount }) => {
		const component = await mount(
			"pages/home/components/GroupedPeriodTable/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("grouped-period-thai-locale.png")
	})

	test("renders expanded income group with nested entry table and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedPeriodTable/IncomeGroups",
		)
		// Expand the first group row via its chevron button.
		await component.locator("button[aria-expanded]").first().click()
		await expect(
			component.getByRole("button", { name: "Salary", exact: true }),
		).toBeVisible()
		await page.waitForTimeout(200)
		await expect(component).toHaveScreenshot("grouped-period-income-expanded.png")
	})
})
