import { test, expect } from "@playwright/test"

test.describe("Home Page Component Visual", () => {
	test("renders plan dashboard with chart and financials and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount("pages/home/home/Default")
		// ECharts paints on canvas after the theme lands; wait for the chart host
		// to have a canvas before capturing.
		await expect(
			component.locator(".mvp-chart-echarts canvas"),
		).toBeVisible()
		await page.waitForTimeout(300)
		await expect(component).toHaveScreenshot("home-default.png")
	})

	test("renders Thai locale dashboard and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount("pages/home/home/ThaiLocale")
		await expect(
			component.locator(".mvp-chart-echarts canvas"),
		).toBeVisible()
		await page.waitForTimeout(300)
		await expect(component).toHaveScreenshot("home-thai-locale.png")
	})
})
