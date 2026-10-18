import type { AccountingSnapshot } from "@excited-live/accounting";
import type { SqlDriver } from "../../../db/types";
import type { AccountingRepository, StoredSnapshot } from "../domain/accounting.repository";
import { VersionConflictError } from "../domain/errors";

export function createSqlAccountingRepository(driver: SqlDriver): AccountingRepository {
	return {
		async load(userId: string): Promise<StoredSnapshot | null> {
			const row = await driver.first<{
				snapshot_json: string;
				version: number;
				updated_at: string;
			}>(
				"SELECT snapshot_json, version, updated_at FROM accounting_snapshots WHERE user_id = ?",
				[userId],
			);

			if (!row) {
				return null;
			}

			try {
				const snapshot: AccountingSnapshot = JSON.parse(row.snapshot_json);
				return {
					snapshot,
					version: row.version,
					updatedAt: row.updated_at,
				};
			} catch {
				return null;
			}
		},

		async save(
			userId: string,
			snapshot: AccountingSnapshot,
			expectedVersion?: number | null,
		): Promise<StoredSnapshot> {
			const now = new Date().toISOString();
			const snapshotToSave: AccountingSnapshot = {
				...snapshot,
				updatedAt: now,
			};
			const jsonString = JSON.stringify(snapshotToSave);

			const existing = await driver.first<{ version: number }>(
				"SELECT version FROM accounting_snapshots WHERE user_id = ?",
				[userId],
			);

			const currentVersion = existing ? existing.version : 0;

			if (
				expectedVersion !== undefined &&
				expectedVersion !== null &&
				expectedVersion !== currentVersion
			) {
				throw new VersionConflictError(
					`Version conflict: expected ${expectedVersion}, but current is ${currentVersion}`,
				);
			}

			const nextVersion = currentVersion + 1;

			await driver.run(
				`INSERT INTO accounting_snapshots (user_id, snapshot_json, version, updated_at)
				 VALUES (?, ?, ?, ?)
				 ON CONFLICT(user_id) DO UPDATE SET
				   snapshot_json = excluded.snapshot_json,
				   version = excluded.version,
				   updated_at = excluded.updated_at`,
				[userId, jsonString, nextVersion, now],
			);

			return {
				snapshot: snapshotToSave,
				version: nextVersion,
				updatedAt: now,
			};
		},
	};
}
