import { test, expect, type Page } from "@playwright/test"

/** The picker's dropdown renders in a popover layer (position: fixed), so
 * opened states are captured on the popover element. */
function pickerPopover(page: Page) {
	return page.locator("[popover]:not([popover=''])")
}

test.describe("MonthYearPicker Component Visual", () => {
	test("renders month-mode picker with selected value and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/MonthYearPicker/MonthMode",
		)
		await expect(component).toHaveScreenshot("month-year-picker-month-mode.png")
	})

	test("renders year-mode picker with forever option and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/MonthYearPicker/YearModeWithForever",
		)
		await expect(component).toHaveScreenshot(
			"month-year-picker-year-mode.png",
		)
	})

	test("renders Thai picker and matches screenshot", async ({ mount }) => {
		const component = await mount(
			"pages/home/components/MonthYearPicker/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("month-year-picker-thai-locale.png")
	})

	test("renders opened dropdown with search and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/MonthYearPicker/MonthMode")
		await page.locator("button").first().click()
		const popover = pickerPopover(page)
		await expect(popover).toBeVisible()
		// Search input lives inside the dropdown; wait for the option list.
		await page.waitForTimeout(200)
		await expect(popover).toHaveScreenshot("month-year-picker-open.png")
	})
})
