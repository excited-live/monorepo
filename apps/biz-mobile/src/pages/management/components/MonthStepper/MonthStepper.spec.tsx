import { test, expect } from "@playwright/test";

test.describe("MonthStepper Component Visual", () => {
	test("renders month stepper and matches screenshot", async ({ mount }) => {
		const component = await mount("MonthStepper");
		await expect(component).toHaveScreenshot("month-stepper-default.png");
	});
});
