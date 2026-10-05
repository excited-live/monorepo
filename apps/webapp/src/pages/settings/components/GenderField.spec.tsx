import { test, expect } from "@playwright/test"

test.describe("GenderField Component Visual", () => {
	test("renders female selected by default and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("pages/settings/components/GenderField/Default")
		await expect(component).toHaveScreenshot("gender-field-default.png")
	})

	test("renders male selected and matches screenshot", async ({ mount }) => {
		const component = await mount(
			"pages/settings/components/GenderField/MaleSelected",
		)
		await expect(component).toHaveScreenshot("gender-field-male.png")
	})

	test("renders Thai labels with other selected and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount(
			"pages/settings/components/GenderField/ThaiLocale",
		)
		await expect(component).toHaveScreenshot("gender-field-thai-locale.png")
	})
})
