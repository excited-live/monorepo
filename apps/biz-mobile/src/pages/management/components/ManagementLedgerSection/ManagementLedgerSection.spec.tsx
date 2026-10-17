import { test, expect } from "@playwright/test";

test.describe("ManagementLedgerSection Visual", () => {
	test("renders ledger section and matches screenshot", async ({ mount }) => {
		const component = await mount("ManagementLedgerSection", {
			monthActions: [
				{ id: "act-1", description: "Monthly Career Salary", amount: 150000, type: "revenue", day: 25 },
				{ id: "act-2", description: "Office Lease", amount: -25000, type: "expense", day: 1 },
			],
			selectedMonth: "2026-10",
			lang: "en",
		});
		await expect(component).toHaveScreenshot("management-ledger-section-default.png");
	});
});
