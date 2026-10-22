import { test, expect } from "@playwright/test";
import type { OnboardingStepId, OnboardingStepStatus, OnboardingStepView } from "../../../../domain/onboarding";

const MCP_URL = "https://api.excited.live/mcp";
const WEBAPP_URL = "https://app.excited.live";

const step = (
	id: OnboardingStepId,
	title: string,
	shortTitle: string,
	status: OnboardingStepStatus,
	skippable = false,
	entryCount = 0,
): OnboardingStepView => ({
	id,
	title,
	shortTitle,
	skippable,
	status,
	entryCount,
	canComplete: entryCount > 0,
	entries: [],
	sections: [],
});

const STEPS: OnboardingStepView[] = [
	step("create_account", "Create Account", "Account", "done", false, 1),
	step("add_business", "Add Business", "Business", "active", true),
	step("assets_wallet", "Wallet & Assets", "Assets", "pending", true),
	step("add_liability", "Add Liability", "Liability", "pending", true),
	step("add_income", "Add Income", "Income", "pending"),
	step("add_expense", "Add Expense", "Expense", "pending"),
];

test.describe("OnboardingAgentSetup Visual", () => {
	test("renders the API key path with a generated prompt", async ({ mount }) => {
		const component = await mount("OnboardingAgentSetup", {
			steps: STEPS,
			isComplete: false,
			mcpUrl: MCP_URL,
			webappUrl: WEBAPP_URL,
			createAgentKey: async () => "elk_demo_4f8c2a1b9d",
			onUseManual: () => {},
		});

		await component.getByRole("button", { name: "Generate key" }).click();
		await expect(component.getByText("Your API key")).toBeVisible();
		await expect(component).toHaveScreenshot("onboarding-agent-setup-api-key.png");
	});

	test("renders the keyless prompt when auth is not configured", async ({ mount }) => {
		const component = await mount("OnboardingAgentSetup", {
			steps: STEPS,
			isComplete: false,
			mcpUrl: MCP_URL,
			webappUrl: WEBAPP_URL,
			createAgentKey: async () => "elk_demo_4f8c2a1b9d",
			onUseManual: () => {},
			initialKeyless: true,
		});

		await expect(component.getByText("Test environment: no key needed.")).toBeVisible();
		await expect(component).toHaveScreenshot("onboarding-agent-setup-no-key.png");
	});

	test("renders the chat connector steps and prompt", async ({ mount }) => {
		const component = await mount("OnboardingAgentSetup", {
			steps: STEPS,
			isComplete: false,
			mcpUrl: MCP_URL,
			webappUrl: WEBAPP_URL,
			createAgentKey: async () => "elk_demo_4f8c2a1b9d",
			onUseManual: () => {},
			initialAgentId: "claude",
		});

		await expect(component.getByText("Add it to your chat app")).toBeVisible();
		await expect(component).toHaveScreenshot("onboarding-agent-setup-chat.png");
	});

	test("renders the device flow prompt for a cloud agent", async ({ mount }) => {
		const component = await mount("OnboardingAgentSetup", {
			steps: STEPS,
			isComplete: false,
			mcpUrl: MCP_URL,
			webappUrl: WEBAPP_URL,
			createAgentKey: async () => "elk_demo_4f8c2a1b9d",
			onUseManual: () => {},
			initialAgentId: "hermes",
		});

		await expect(component.getByText("Send this prompt to your cloud agent")).toBeVisible();
		await expect(component).toHaveScreenshot("onboarding-agent-setup-device.png");
	});

	test("explains that link sign-in is unavailable without a webapp origin", async ({ mount }) => {
		const component = await mount("OnboardingAgentSetup", {
			steps: STEPS,
			isComplete: false,
			mcpUrl: MCP_URL,
			webappUrl: null,
			createAgentKey: async () => "elk_demo_4f8c2a1b9d",
			onUseManual: () => {},
			initialAgentId: "claude",
		});

		await expect(component.getByText("Sign-in link not available in this environment.")).toBeVisible();
		await expect(component).toHaveScreenshot("onboarding-agent-setup-no-webapp.png");
	});
});
