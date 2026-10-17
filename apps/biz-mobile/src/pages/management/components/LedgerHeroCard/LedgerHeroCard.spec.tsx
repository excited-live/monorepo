import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("LedgerHeroCard Component Visual", () => {
	test("renders cashflow projection chart and matches screenshot", async ({ mount }) => {
		const component = await mount("LedgerHeroCard", {
			account: FIXTURE_ACCOUNTS[0]!,
			yearMonth: "2026-10",
		});
		await expect(component).toHaveScreenshot("ledger-hero-card-default.png");
	});
});
