import { test, expect } from "@playwright/test";

test.describe("OnboardingMethodChooser Visual", () => {
	test("renders the agent-first chooser with the manual fallback", async ({ mount }) => {
		const component = await mount("OnboardingMethodChooser", {
			onSelect: () => {},
		});
		await expect(component).toHaveScreenshot("onboarding-method-chooser.png");
	});
});
