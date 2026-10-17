import { test, expect } from "@playwright/test";
import {
	FIXTURE_ACCOUNTS,
	FIXTURE_HARDWARE,
	FIXTURE_LIABILITIES,
	FIXTURE_REVENUES,
	FIXTURE_SUBSCRIPTIONS,
	FIXTURE_TRANSFERS,
} from "../../../../testing/fixtures";

test.describe("ManagementAssetsSection Visual", () => {
	test("renders assets section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementAssetsSection", {
			activeAccount: FIXTURE_ACCOUNTS[0]!,
			hardware: FIXTURE_HARDWARE,
			transfers: FIXTURE_TRANSFERS,
			subscriptions: FIXTURE_SUBSCRIPTIONS,
			revenues: FIXTURE_REVENUES,
			liabilities: FIXTURE_LIABILITIES,
			selectedMonth: "2026-10",
			cashAssets: FIXTURE_HARDWARE.filter((h) => h.category === "cash" || h.category === "bank_account"),
			gearAssets: FIXTURE_HARDWARE.filter((h) => h.category !== "cash" && h.category !== "bank_account"),
			totalLiquidReserves: 1500000,
			totalBookValue: 120000,
			totalDepreciation: 15000,
			lang: "en",
		});
		await expect(component).toHaveScreenshot("management-assets-section-default.png");
	});
});
