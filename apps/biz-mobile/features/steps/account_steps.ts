import { Given, When, Then } from "@cucumber/cucumber";
import { expect, type Page } from "@playwright/test";

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
	void dateStr;
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

// ---------------------------------------------------------------------------
// Onboarding stepper helpers
//
// The checklist renders a horizontal Astryx Stepper bar (<li> per step, short
// labels) plus a single panel for the viewed step (data-testid
// "onboarding-step-panel"). Only one panel exists at a time.
// ---------------------------------------------------------------------------

const stepCard = (page: Page, title: string) => page.locator("li").filter({ hasText: title }).first();

const stepPanel = (page: Page) => page.getByTestId("onboarding-step-panel");

const panelButton = (page: Page, label: string) =>
	stepPanel(page).getByRole("button", { name: label, exact: true });

Then("the user should see the onboarding stepper with steps:", async function (dataTable) {
	for (const row of dataTable.hashes()) {
		await expect(stepCard(this.page, row.Step)).toBeVisible();
	}
});

Then("only the {string} step panel should be visible", async function (title: string) {
	await expect(stepPanel(this.page)).toHaveCount(1);
	await expect(stepPanel(this.page)).toContainText(title);
});

Then("the {string} step panel should not be visible", async function (title: string) {
	await expect(stepPanel(this.page)).not.toContainText(title);
});

Then("the {string} step should be marked {string} on the checklist", async function (title: string, status: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await expect(stepPanel(this.page)).toContainText(status);
});

Then("the {string} step should offer {string}", async function (title: string, label: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await expect(panelButton(this.page, label)).toBeVisible();
});

Then("the {string} step should not offer {string}", async function (title: string, label: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await expect(panelButton(this.page, label)).toHaveCount(0);
});

Then("the {string} step should offer a disabled {string} button", async function (title: string, label: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await expect(panelButton(this.page, label)).toBeDisabled();
});

Then("the {string} step should list {int} entries", async function (title: string, count: number) {
	await expect(stepPanel(this.page)).toContainText(title);
	const entries = stepPanel(this.page)
		.locator("button")
		.filter({ hasNotText: /^(Add|Done|Skip for now|Set up now)$/ });
	await expect(entries).toHaveCount(count);
});

Then(
	"the {string} step should list the entity sections {string} first, then {string}",
	async function (title: string, first: string, second: string) {
		await expect(stepPanel(this.page)).toContainText(title);
		const firstSection = stepPanel(this.page).getByText(first, { exact: false }).first();
		const secondSection = stepPanel(this.page).getByText(second, { exact: false }).first();
		await expect(firstSection).toBeVisible();
		await expect(secondSection).toBeVisible();
		const firstBox = await firstSection.boundingBox();
		const secondBox = await secondSection.boundingBox();
		if (!firstBox || !secondBox) throw new Error("entity sections not measurable");
		expect(firstBox.y).toBeLessThan(secondBox.y);
	},
);

When("the user marks the {string} step done on the checklist", async function (title: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await panelButton(this.page, "Done").click();
});

When("the user skips the {string} step on the checklist", async function (title: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await panelButton(this.page, "Skip for now").click();
});

When("the user taps {string} in the {string} step on the checklist", async function (label: string, title: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await panelButton(this.page, label).first().click();
});

When("the user taps the {string} step on the checklist", async function (label: string) {
	await stepCard(this.page, label).getByText(label, { exact: true }).first().click();
});

When("the user taps the entry {string} in the {string} step on the checklist", async function (entry: string, title: string) {
	await expect(stepPanel(this.page)).toContainText(title);
	await stepPanel(this.page)
		.getByRole("button", { name: new RegExp(entry) })
		.first()
		.click();
});

Then("the {string} drawer should not open", async function () {
	await expect(this.page.getByRole("dialog")).toBeHidden();
});

Then("the {string} drawer should open with {string} prefilled", async function (_drawer: string, value: string) {
	await expect(this.page.getByRole("dialog")).toBeVisible();
	await expect(this.page.getByRole("dialog")).toContainText(value);
});

Then("the onboarding stepper should no longer be visible on the Homepage", async function () {
	await expect(this.page.getByText("Onboarding Checklist")).toBeHidden();
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

Then("the {string} drawer should dismiss", async function () {
	await expect(this.page.getByRole("dialog")).toBeHidden();
});

Then("a new entity {string} should appear in the entity list", async function (bizName: string) {
	await expect(this.page.getByText(bizName)).toBeVisible();
});

When("the user taps the business settings icon {string} on the hero card", async function () {
	await this.page.locator(".hero-config-btn").click();
});

When("the user confirms the deletion dialog", async function () {
	this.page.on("dialog", (dialog: { accept: () => void }) => dialog.accept());
});

Then("the active entity should automatically fallback to {string}", async function (entityName: string) {
	await expect(this.page.locator(".hero-eyebrow-col")).toContainText(entityName);
});
