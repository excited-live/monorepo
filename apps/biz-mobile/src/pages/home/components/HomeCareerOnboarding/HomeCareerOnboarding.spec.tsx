import { test, expect } from "@playwright/test";

test.describe("HomeCareerOnboarding Visual", () => {
	test("renders career onboarding card and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeCareerOnboarding");
		await expect(component).toHaveScreenshot("home-career-onboarding-default.png");
	});
});
