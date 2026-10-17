import { test, expect } from "@playwright/test";
import { FIXTURE_USER_SESSION } from "../../../../testing/fixtures";

test.describe("SettingsProfileSection Visual", () => {
	test("renders profile section and matches screenshot", async ({ mount }) => {
		const component = await mount("SettingsProfileSection", {
			userSession: FIXTURE_USER_SESSION,
			isCloudAccount: true,
		});
		await expect(component).toHaveScreenshot("settings-profile-section-default.png");
	});
});
