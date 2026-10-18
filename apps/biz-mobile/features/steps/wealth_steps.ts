import { When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

// =========================================================================
// WEALTH MANAGEMENT STEP DEFINITIONS
// =========================================================================

Then("the {string} should display consolidated financial metrics:", async function (panelName: string, dataTable) {
	const rows = dataTable.hashes();
	for (const row of rows) {
		await expect(this.page.locator(`text=${row["Expected Value"]}`)).toBeVisible();
	}
});

Then("the hero card eyebrow should display {string}", async function (eyebrowText: string) {
	await expect(this.page.locator(".hero-eyebrow")).toHaveText(eyebrowText);
});

Then("the primary hero balance should display current wealth {string}", async function (wealthText: string) {
	await expect(this.page.locator(".hero-balance")).toContainText(wealthText);
});

When("the user taps {string} on the hero card", async function (_text: string) {
	await this.page.locator(".hero-flip-hint").click();
});

Then("the {string} face should become visible and interactive", async function (_cardFace: string) {
	await expect(this.page.locator(".hero-chart")).toBeVisible();
});

When("the user sets the capital injection details:", async function (dataTable) {
	const data = dataTable.rowsHash();
	if (data["Transfer Amount"]) {
		await this.page.getByPlaceholder("0.00").fill(data["Transfer Amount"]);
	}
	if (data["Reference Note"]) {
		await this.page.getByPlaceholder(/seed/i).fill(data["Reference Note"]);
	}
});

Then("the Live Runway Impact Simulation Box should display:", async function (dataTable) {
	for (const row of dataTable.hashes()) {
		await expect(this.page.getByText(row.Entity)).toBeVisible();
	}
});

When("the user taps the next month button {string}", async function (_btnSymbol: string) {
	await this.page.getByRole("button", { name: /Next Month/i }).click();
});

Then("the selected month should become {string}", async function (monthStr: string) {
	await expect(this.page.getByText(new RegExp(monthStr, "i"))).toBeVisible();
});
