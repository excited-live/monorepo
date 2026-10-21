import type { SqlDriver } from "../db/types";

export interface UserOnboarding {
	userId: string;
	appId: string;
	isCompleted: boolean;
	completedAt: string | null;
	done: string[];
	skipped: string[];
	updatedAt: string;
}

export const DEFAULT_APP_ID = "biz-mobile";

export function defaultUserOnboarding(userId: string, appId: string = DEFAULT_APP_ID): UserOnboarding {
	return {
		userId,
		appId,
		isCompleted: false,
		completedAt: null,
		done: ["create_account"],
		skipped: [],
		updatedAt: new Date().toISOString(),
	};
}

export interface OnboardingStore {
	get(userId: string, appId?: string): Promise<UserOnboarding>;
	save(
		userId: string,
		input: {
			appId?: string;
			isCompleted?: boolean;
			done?: string[];
			skipped?: string[];
		},
	): Promise<UserOnboarding>;
}

interface OnboardingRow {
	user_id: string;
	app_id: string;
	is_completed: number;
	completed_at: string | null;
	done_steps: string;
	skipped_steps: string;
	updated_at: string;
}

export function createOnboardingStore(driver: SqlDriver): OnboardingStore {
	return {
		async get(userId: string, appId: string = DEFAULT_APP_ID): Promise<UserOnboarding> {
			const row = await driver.first<OnboardingRow>(
				"SELECT user_id, app_id, is_completed, completed_at, done_steps, skipped_steps, updated_at FROM user_onboarding WHERE user_id = ? AND app_id = ?",
				[userId, appId],
			);
			if (!row) {
				return defaultUserOnboarding(userId, appId);
			}

			let done: string[] = ["create_account"];
			try {
				const parsed = JSON.parse(row.done_steps);
				if (Array.isArray(parsed)) done = parsed;
			} catch {
				// Malformed JSON — fall back to the default step set.
			}

			let skipped: string[] = [];
			try {
				const parsed = JSON.parse(row.skipped_steps);
				if (Array.isArray(parsed)) skipped = parsed;
			} catch {
				// Malformed JSON — fall back to no skipped steps.
			}

			return {
				userId: row.user_id,
				appId: row.app_id,
				isCompleted: Boolean(row.is_completed),
				completedAt: row.completed_at,
				done,
				skipped,
				updatedAt: row.updated_at,
			};
		},

		async save(
			userId: string,
			input: {
				appId?: string;
				isCompleted?: boolean;
				done?: string[];
				skipped?: string[];
			},
		): Promise<UserOnboarding> {
			const appId = input.appId ?? DEFAULT_APP_ID;
			const current = await this.get(userId, appId);

			const isCompleted = input.isCompleted ?? current.isCompleted;
			const completedAt =
				isCompleted
					? (current.completedAt ?? new Date().toISOString())
					: null;
			const done = input.done ? Array.from(new Set(input.done)) : current.done;
			const skipped = input.skipped ? Array.from(new Set(input.skipped)) : current.skipped;
			const updatedAt = new Date().toISOString();

			await driver.run(
				`INSERT INTO user_onboarding (user_id, app_id, is_completed, completed_at, done_steps, skipped_steps, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, app_id) DO UPDATE SET
					is_completed = excluded.is_completed,
					completed_at = excluded.completed_at,
					done_steps = excluded.done_steps,
					skipped_steps = excluded.skipped_steps,
					updated_at = excluded.updated_at`,
				[
					userId,
					appId,
					isCompleted ? 1 : 0,
					completedAt,
					JSON.stringify(done),
					JSON.stringify(skipped),
					updatedAt,
				],
			);

			return {
				userId,
				appId,
				isCompleted,
				completedAt,
				done,
				skipped,
				updatedAt,
			};
		},
	};
}
