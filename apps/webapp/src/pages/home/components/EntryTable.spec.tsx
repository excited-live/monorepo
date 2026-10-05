import { test, expect } from "@playwright/test"

test.describe("EntryTable Component Visual", () => {
	test("renders filled income table and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("pages/home/components/EntryTable/Default")
		await expect(component).toHaveScreenshot("entry-table-default.png")
	})

	test("renders Thai income table and matches screenshot", async ({ mount }) => {
		const component = await mount(
			"pages/home/components/EntryTable/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("entry-table-thai-locale.png")
	})
})
