import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

// =========================================================================
// ACCOUNT MANAGEMENT & ONBOARDING STEP DEFINITIONS
// =========================================================================

Given("the user opens the application for the first time without cached data", async function () {
	await this.page?.evaluate?.(() => {
		localStorage.clear();
	});
	await this.page?.reload?.();
});

Given("the user is logged into the mobile app as {string} with ID {string}", async function (name: string, id: string) {
	await this.page?.evaluate?.(([userName, userId]: [string, string]) => {
		localStorage.setItem("biz_session", JSON.stringify({ id: userId, name: userName, isAuthenticated: true }));
	}, [name, id]);
});

Given("the application is launched on a mobile viewport", async function () {
	await this.page?.setViewportSize?.({ width: 390, height: 844 }); // iPhone 14/15 viewport
});

Given("the current system date is {string} with selected month {string}", async function (dateStr: string, monthStr: string) {
	await this.page?.evaluate?.((ym: string) => {
		localStorage.setItem("biz_selected_month", ym);
	}, monthStr);
});

When("the user navigates to the {string} tab", async function (tabName: string) {
	await this.page?.getByRole?.("tab", { name: new RegExp(tabName, "i") })?.click?.();
});

Then("the {string} section should be displayed", async function (sectionTitle: string) {
	await expect(this.page.getByText(new RegExp(sectionTitle, "i"))).toBeVisible();
});

Then("the user should land on the {string} tab and see the Onboarding Checklist:", async function (tabName: string, dataTable) {
	for (const row of dataTable.hashes()) {
		await expect(this.page.getByText(row.Step)).toBeVisible();
	}
});

Then("the Homepage should display:", async function (dataTable) {
	for (const row of dataTable.hashes()) {
		if (row["State / Content"]) {
			await expect(this.page.getByText(row["State / Content"])).toBeVisible();
		}
	}
});

Then("the Management page should display:", async function (dataTable) {
	for (const row of dataTable.hashes()) {
		if (row["State / Content"]) {
			await expect(this.page.getByText(row["State / Content"])).toBeVisible();
		}
	}
});

When("the user taps {string}", async function (buttonLabel: string) {
	await this.page.getByRole("button", { name: new RegExp(buttonLabel, "i") }).click();
});

Then("the {string} drawer should slide up", async function (drawerTitle: string) {
	await expect(this.page.getByRole("dialog")).toBeVisible();
	await expect(this.page.getByText(drawerTitle)).toBeVisible();
});

Then("the {string} button should be {string}", async function (buttonLabel: string, state: string) {
	const btn = this.page.getByRole("button", { name: new RegExp(buttonLabel, "i") });
	if (state === "disabled") {
		await expect(btn).toBeDisabled();
	} else {
		await expect(btn).toBeEnabled();
	}
});

When("the user fills in the business form:", async function (dataTable) {
	const data = dataTable.rowsHash();
	if (data["Business Name"]) {
		await this.page.getByLabel("Business Name").fill(data["Business Name"]);
	}
	if (data["Image URL"]) {
		await this.page.getByPlaceholder(/image url/i).fill(data["Image URL"]);
	}
});

When("the user submits the business form", async function () {
	await this.page.locator('button[type="submit"][form="business-form"]').click();
});

Then("the {string} drawer should dismiss", async function (_drawerTitle: string) {
	await expect(this.page.getByRole("dialog")).toBeHidden();
});

Then("a new entity {string} should appear in the entity list", async function (bizName: string) {
	await expect(this.page.getByText(bizName)).toBeVisible();
});

When("the user taps the business settings icon {string} on the hero card", async function (_iconName: string) {
	await this.page.locator(".hero-config-btn").click();
});

When("the user confirms the deletion dialog", async function () {
	this.page.on("dialog", (dialog: { accept: () => void }) => dialog.accept());
});

Then("the active entity should automatically fallback to {string}", async function (entityName: string) {
	await expect(this.page.locator(".hero-eyebrow-col")).toContainText(entityName);
});
