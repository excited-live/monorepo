import { test, expect } from "@playwright/test"

test.describe("AssistantRail Component Visual", () => {
	test("renders empty assistant rail and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/AssistantRail/Empty")
		await expect(component).toHaveScreenshot("assistant-rail-empty.png")
	})

	test("renders Thai locale assistant rail and matches screenshot", async ({
		mount,
	}) => {
		const component = await mount("components/AssistantRail/ThaiLocale")
		await expect(component).toHaveScreenshot("assistant-rail-th.png")
	})
})
