import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("CapitalHeroCard Component Visual", () => {
	test("renders personal wealth hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("CapitalHeroCard", { account: FIXTURE_ACCOUNTS[0]! });
		await expect(component).toHaveScreenshot("capital-hero-card-personal.png");
	});

	test("renders business book value hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("CapitalHeroCard", { account: FIXTURE_ACCOUNTS[1]! });
		await expect(component).toHaveScreenshot("capital-hero-card-business.png");
	});
});
