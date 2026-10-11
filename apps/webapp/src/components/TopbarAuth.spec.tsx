import { test, expect } from "@playwright/test"

test.describe("TopbarAuth Component Visual", () => {
	test("renders sign-in link when unauthenticated and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/TopbarAuth/SignedOut")
		await expect(component).toHaveScreenshot("topbar-auth-signed-out.png")
	})

	test("renders user name and sign-out when authenticated and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/TopbarAuth/SignedIn")
		await expect(component).toHaveScreenshot("topbar-auth-signed-in.png")
	})

	test("renders Thai sign-in label and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/TopbarAuth/ThaiLocale")
		await expect(component).toHaveScreenshot("topbar-auth-thai-locale.png")
	})
})
