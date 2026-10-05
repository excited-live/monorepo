import { test, expect } from "@playwright/test"

test.describe("ProjectionChart Component Visual", () => {
	// The chart initializes only after the Astryx theme attribute lands, then
	// animates in on canvas — wait for the canvas and settle before capture.
	test("renders net worth chart with band and milestones and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			"pages/home/components/ProjectionChart/NetWorth",
		)
		await expect(component.locator(".mvp-chart-echarts canvas")).toBeVisible()
		await page.waitForTimeout(700)
		await expect(component).toHaveScreenshot("projection-chart-net-worth.png")
	})

	test("renders cash flow chart and matches screenshot", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			"pages/home/components/ProjectionChart/CashFlow",
		)
		await expect(component.locator(".mvp-chart-echarts canvas")).toBeVisible()
		await page.waitForTimeout(700)
		await expect(component).toHaveScreenshot("projection-chart-cash-flow.png")
	})
})
