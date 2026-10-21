import { test, expect } from "@playwright/test";

const KEYS = [
	{
		id: "key_1",
		name: "Claude Code on MacBook",
		agentId: "claude-code",
		createdAt: "2026-10-01T09:00:00.000Z",
		expiresAt: "2026-12-30T09:00:00.000Z",
		lastRequest: "2026-10-18T08:30:00.000Z",
	},
	{
		id: "key_2",
		name: "Hermes",
		agentId: "hermes",
		createdAt: "2026-09-12T09:00:00.000Z",
		expiresAt: "2026-12-11T09:00:00.000Z",
		lastRequest: null,
	},
];

test.describe("SettingsConnectedAgentsSection Visual", () => {
	test("renders connected keys with created, last used and expiry", async ({ mount }) => {
		const component = await mount("SettingsConnectedAgentsSection", {
			keys: KEYS,
			onRevoke: () => {},
		});
		await expect(component).toHaveScreenshot("settings-connected-agents.png");
	});

	test("renders the empty state", async ({ mount }) => {
		const component = await mount("SettingsConnectedAgentsSection", { keys: [] });
		await expect(component).toHaveScreenshot("settings-connected-agents-empty.png");
	});
});
