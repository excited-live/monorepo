import { test, expect } from "@playwright/test";

test.describe("CurrencyInput Component Visual", () => {
	test("renders empty currency input and matches screenshot", async ({ mount }) => {
		const component = await mount("components/CurrencyInput/Empty");
		await expect(component).toHaveScreenshot("currency-input-empty.png");
	});

	test("renders formatted currency input and matches screenshot", async ({ mount }) => {
		const component = await mount("components/CurrencyInput/FormattedValue");
		await expect(component).toHaveScreenshot("currency-input-formatted.png");
	});
});
