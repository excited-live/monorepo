import { test, expect } from "@playwright/test"

test.describe("Settings Page Component Visual", () => {
	test("renders profile settings form and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("pages/settings/settings/Default")
		await expect(component).toHaveScreenshot("settings-default.png")
	})

	test("renders Thai locale settings form and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("pages/settings/settings/ThaiLocale")
		await expect(component).toHaveScreenshot("settings-thai-locale.png")
	})
})
