import { test, expect } from "@playwright/test";
import type { OnboardingStepView } from "../../../../domain/onboarding";

const noop = () => {};

const STEPS: OnboardingStepView[] = [
	{
		id: "create_account",
		title: "Create Account",
		shortTitle: "Account",
		skippable: false,
		status: "done",
		entryCount: 1,
		canComplete: true,
		entries: [],
		sections: [],
	},
	{
		id: "add_business",
		title: "Add Business",
		shortTitle: "Business",
		skippable: true,
		status: "done",
		entryCount: 1,
		canComplete: true,
		entries: [{ id: "acc_business_1", label: "FromSukong Media" }],
		sections: [],
	},
	{
		id: "assets_wallet",
		title: "Wallet & Assets",
		shortTitle: "Assets",
		skippable: true,
		status: "skipped",
		entryCount: 0,
		canComplete: false,
		entries: [],
		sections: [
			{
				entityId: "acc_personal",
				entityName: "Alex Living",
				entries: [{ id: "hw_1", label: "MacBook Pro 16", meta: "89,000.00" }],
			},
		],
	},
	{
		id: "add_liability",
		title: "Add Liability",
		shortTitle: "Liability",
		skippable: true,
		status: "active",
		entryCount: 1,
		canComplete: true,
		entries: [],
		sections: [
			{ entityId: "acc_personal", entityName: "Alex Living", entries: [] },
			{
				entityId: "acc_business_1",
				entityName: "FromSukong Media",
				entries: [{ id: "liab_1", label: "Equipment Lease", meta: "3,500.00" }],
			},
		],
	},
	{
		id: "add_income",
		title: "Add Income",
		shortTitle: "Income",
		skippable: false,
		status: "pending",
		entryCount: 1,
		canComplete: true,
		entries: [],
		sections: [
			{
				entityId: "acc_personal",
				entityName: "Alex Living",
				entries: [{ id: "rev_1", label: "Principal Product Engineer Salary", meta: "120,000.00" }],
			},
		],
	},
	{
		id: "add_expense",
		title: "Add Expense",
		shortTitle: "Expense",
		skippable: false,
		status: "pending",
		entryCount: 0,
		canComplete: false,
		entries: [],
		sections: [{ entityId: "acc_personal", entityName: "Alex Living", entries: [] }],
	},
];

test.describe("HomeOnboardingChecklist Visual", () => {
	test("renders the horizontal stepper with only the active step panel", async ({ mount }) => {
		const component = await mount("HomeOnboardingChecklist", {
			steps: STEPS,
			activeIndex: 3,
			isComplete: false,
			completedCount: 2,
			onCompleteStep: noop,
			onSkipStep: noop,
			onReopenStep: noop,
			onAddEntry: noop,
			onEditEntry: noop,
		});
		await expect(component).toHaveScreenshot("onboarding-checklist-active-step.png");
	});
});
