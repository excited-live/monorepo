import { test, expect } from "@playwright/test";

test.describe("SettingsCloudSyncSection Visual", () => {
	test("renders cloud sync section and matches screenshot", async ({ mount }) => {
		const component = await mount("SettingsCloudSyncSection", {
			cloudSyncStatus: "synced",
			lastSyncedAt: "2026-10-17 12:00:00",
			lang: "en",
		});
		await expect(component).toHaveScreenshot("settings-cloud-sync-section-default.png");
	});
});
