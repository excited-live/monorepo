import { test, expect, type Page } from "@playwright/test"

/** The dialog renders in the native top layer (position: fixed), so the
 * screenshot target is the open dialog element, not #root. */
function openDialog(page: Page) {
	return page.locator("dialog[open]")
}

test.describe("EntryDialog Component Visual", () => {
	test("renders add-income dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/EntryDialog/AddIncome")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot("entry-dialog-add-income.png")
	})

	test("renders edit salary dialog pre-filled and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/EntryDialog/EditSalary")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot("entry-dialog-edit-salary.png")
	})

	test("renders edit expense dialog with deductible control and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/EntryDialog/EditExpenseDeductible")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"entry-dialog-edit-expense-deductible.png",
		)
	})

	test("renders Thai add-expense dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/EntryDialog/ThaiLocale")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot("entry-dialog-thai-locale.png")
	})
})
