import { test, expect } from "@playwright/test"

test.describe("GroupedValueTable Component Visual", () => {
	test("renders collapsed asset groups and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedValueTable/AssetGroups",
		)
		await expect(component).toHaveScreenshot("grouped-value-asset-groups.png")
	})

	test("renders collapsed liability groups and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedValueTable/LiabilityGroups",
		)
		await expect(component).toHaveScreenshot("grouped-value-liability-groups.png")
	})

	test("renders Thai asset groups and matches screenshot", async ({ mount }) => {
		const component = await mount(
			"pages/home/components/GroupedValueTable/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("grouped-value-thai-locale.png")
	})

	test("renders expanded asset group with nested entries and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			"pages/home/components/GroupedValueTable/AssetGroups",
		)
		await component.locator("button[aria-expanded]").first().click()
		await expect(component.getByText("SET index fund")).toBeVisible()
		await page.waitForTimeout(200)
		await expect(component).toHaveScreenshot("grouped-value-assets-expanded.png")
	})
})
