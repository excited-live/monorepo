import {
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
	SEED_ACCOUNTS,
	SEED_HARDWARE,
	SEED_LIABILITIES,
	SEED_REVENUES,
	SEED_SUBSCRIPTIONS,
	SEED_TRANSFERS,
} from "@excited-live/biz";
import type { SqlDriver } from "../db/types";

export interface BizDataSnapshot {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	liabilities: LiabilityStream[];
	updatedAt: string;
	isDefault?: boolean;
}

export interface BizStore {
	get(userId: string): Promise<BizDataSnapshot>;
	save(userId: string, data: Omit<BizDataSnapshot, "updatedAt">): Promise<void>;
}

export function createBizStore(driver: SqlDriver): BizStore {
	return {
		async get(userId: string): Promise<BizDataSnapshot> {
			const row = await driver.first<{
				accounts_json: string;
				subscriptions_json: string;
				hardware_json: string;
				revenues_json: string;
				transfers_json: string;
				liabilities_json?: string | null;
				updated_at: string;
			}>(
				"SELECT accounts_json, subscriptions_json, hardware_json, revenues_json, transfers_json, liabilities_json, updated_at FROM biz_snapshots WHERE user_id = ?",
				[userId],
			);

			if (!row) {
				return {
					accounts: SEED_ACCOUNTS,
					subscriptions: SEED_SUBSCRIPTIONS,
					hardware: SEED_HARDWARE,
					revenues: SEED_REVENUES,
					transfers: SEED_TRANSFERS,
					liabilities: SEED_LIABILITIES,
					updatedAt: new Date().toISOString(),
					isDefault: true,
				};
			}

			let parsedLiabilities: LiabilityStream[] = SEED_LIABILITIES;
			if (row.liabilities_json) {
				try {
					parsedLiabilities = JSON.parse(row.liabilities_json);
				} catch {
					parsedLiabilities = SEED_LIABILITIES;
				}
			}

			return {
				accounts: JSON.parse(row.accounts_json),
				subscriptions: JSON.parse(row.subscriptions_json),
				hardware: JSON.parse(row.hardware_json),
				revenues: JSON.parse(row.revenues_json),
				transfers: JSON.parse(row.transfers_json),
				liabilities: parsedLiabilities,
				updatedAt: row.updated_at,
				isDefault: false,
			};
		},

		async save(userId: string, data: Omit<BizDataSnapshot, "updatedAt">): Promise<void> {
			const now = new Date().toISOString();
			await driver.run(
				`INSERT INTO biz_snapshots (user_id, accounts_json, subscriptions_json, hardware_json, revenues_json, transfers_json, liabilities_json, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET
				   accounts_json = excluded.accounts_json,
				   subscriptions_json = excluded.subscriptions_json,
				   hardware_json = excluded.hardware_json,
				   revenues_json = excluded.revenues_json,
				   transfers_json = excluded.transfers_json,
				   liabilities_json = excluded.liabilities_json,
				   updated_at = excluded.updated_at`,
				[
					userId,
					JSON.stringify(data.accounts),
					JSON.stringify(data.subscriptions),
					JSON.stringify(data.hardware),
					JSON.stringify(data.revenues),
					JSON.stringify(data.transfers),
					JSON.stringify(data.liabilities ?? []),
					now,
				],
			);
		},
	};
}
