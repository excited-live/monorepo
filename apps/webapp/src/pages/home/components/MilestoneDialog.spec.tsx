import { test, expect, type Page } from "@playwright/test"

function openDialog(page: Page) {
	return page.locator("dialog[open]")
}

test.describe("MilestoneDialog Component Visual", () => {
	test("renders add milestone dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/MilestoneDialog/AddMilestone")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"milestone-dialog-add.png",
		)
	})

	test("renders edit milestone dialog pre-filled and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/MilestoneDialog/EditMilestone")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"milestone-dialog-edit.png",
		)
	})

	test("renders Thai add milestone dialog and matches screenshot", async ({
		mount,
		page,
	}) => {
		await mount("pages/home/components/MilestoneDialog/ThaiLocale")
		await expect(openDialog(page)).toBeVisible()
		await expect(openDialog(page)).toHaveScreenshot(
			"milestone-dialog-thai-locale.png",
		)
	})
})
