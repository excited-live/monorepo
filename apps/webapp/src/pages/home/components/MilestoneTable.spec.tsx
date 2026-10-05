import { test, expect } from "@playwright/test"

test.describe("MilestoneTable Component Visual", () => {
	test("renders filled milestone table and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/MilestoneTable/Default",
		)
		await expect(component).toHaveScreenshot("milestone-table-default.png")
	})

	test("renders Thai milestone table and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/MilestoneTable/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("milestone-table-thai-locale.png")
	})
})
