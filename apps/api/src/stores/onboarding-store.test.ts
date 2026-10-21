import { describe, expect, it } from "vitest";
import { createOnboardingStore } from "./onboarding-store";
import { applyMigrations } from "../db/apply";
import { createNodeSqliteDriver } from "../db/node-sqlite";

const driver = await createNodeSqliteDriver(":memory:");
await applyMigrations(driver);
const store = createOnboardingStore(driver);

describe("onboarding store", () => {
	it("returns default onboarding state for a brand new user", async () => {
		const onboarding = await store.get("new-user-1");
		expect(onboarding.userId).toBe("new-user-1");
		expect(onboarding.appId).toBe("biz-mobile");
		expect(onboarding.isCompleted).toBe(false);
		expect(onboarding.completedAt).toBeNull();
		expect(onboarding.done).toEqual(["create_account"]);
		expect(onboarding.skipped).toEqual([]);
	});

	it("saves progress and updates done/skipped steps", async () => {
		const saved = await store.save("user-2", {
			done: ["create_account", "assets_wallet"],
			skipped: ["add_business"],
		});
		expect(saved.isCompleted).toBe(false);
		expect(saved.done).toEqual(["create_account", "assets_wallet"]);
		expect(saved.skipped).toEqual(["add_business"]);

		const read = await store.get("user-2");
		expect(read.done).toEqual(["create_account", "assets_wallet"]);
		expect(read.skipped).toEqual(["add_business"]);
		expect(read.isCompleted).toBe(false);
	});

	it("sets completedAt when isCompleted is set to true", async () => {
		const saved = await store.save("user-3", {
			isCompleted: true,
			done: ["create_account", "add_income", "add_expense"],
		});
		expect(saved.isCompleted).toBe(true);
		expect(saved.completedAt).toBeTruthy();

		const read = await store.get("user-3");
		expect(read.isCompleted).toBe(true);
		expect(read.completedAt).toBe(saved.completedAt);
	});

	it("keeps apps isolated for the same user", async () => {
		await store.save("user-4", {
			appId: "biz-mobile",
			done: ["create_account", "add_expense"],
		});
		await store.save("user-4", {
			appId: "webapp",
			done: ["survey_profile", "risk_tolerance"],
		});

		const mobile = await store.get("user-4", "biz-mobile");
		const web = await store.get("user-4", "webapp");

		expect(mobile.done).toEqual(["create_account", "add_expense"]);
		expect(web.done).toEqual(["survey_profile", "risk_tolerance"]);
	});
});
