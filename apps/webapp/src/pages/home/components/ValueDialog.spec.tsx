import { test, expect, type Page } from "@playwright/test"

function openDialog(page: Page) {
	return page.locator("dialog[open]")
}

test.describe("ValueDialog Component Visual", () => {
	test("renders add asset dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/ValueDialog/AddAsset")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot("value-dialog-add-asset.png")
	})

	test("renders edit liability dialog pre-filled and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/ValueDialog/EditLiability")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"value-dialog-edit-liability.png",
		)
	})

	test("renders Thai add asset dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/ValueDialog/ThaiLocale")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"value-dialog-thai-locale.png",
		)
	})
})
