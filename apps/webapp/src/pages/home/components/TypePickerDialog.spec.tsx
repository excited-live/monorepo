import { test, expect, type Page } from "@playwright/test"

function openDialog(page: Page) {
	return page.locator("dialog[open]")
}

test.describe("TypePickerDialog Component Visual", () => {
	test("renders income type picker with full catalog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/TypePickerDialog/AddIncomeType")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"type-picker-add-income.png",
		)
	})

	test("renders picker with salary already added and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/TypePickerDialog/SalaryAlreadyAdded")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"type-picker-salary-added.png",
		)
	})

	test("renders all-types-added empty state and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/TypePickerDialog/AllTypesAdded")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"type-picker-all-added.png",
		)
	})

	test("renders Thai income type picker and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/TypePickerDialog/ThaiLocale")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"type-picker-thai-locale.png",
		)
	})
})
