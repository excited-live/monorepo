import { test, expect } from "@playwright/test"

test.describe("Topbar Component Visual", () => {
	test("renders unauthenticated default state and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/Topbar/Default")
		await expect(component).toHaveScreenshot("topbar-default.png")
	})

	test("renders authenticated state with user info and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/Topbar/Authenticated")
		await expect(component).toHaveScreenshot("topbar-authenticated.png")
	})

	test("renders with settings tab active and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/Topbar/SettingsActive")
		await expect(component).toHaveScreenshot("topbar-settings-active.png")
	})

	test("renders Thai locale toggle and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/Topbar/ThaiLocale")
		await expect(component).toHaveScreenshot("topbar-thai-locale.png")
	})
})
