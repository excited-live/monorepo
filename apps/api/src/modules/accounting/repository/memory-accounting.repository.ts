import type { AccountingSnapshot } from "@excited-live/accounting";
import type { AccountingRepository, StoredSnapshot } from "../domain/accounting.repository";
import { VersionConflictError } from "../domain/errors";

export function createMemoryAccountingRepository(
	initialData?: Map<string, StoredSnapshot>,
): AccountingRepository {
	const store = initialData ?? new Map<string, StoredSnapshot>();

	return {
		async load(userId: string): Promise<StoredSnapshot | null> {
			const entry = store.get(userId);
			if (!entry) return null;
			return JSON.parse(JSON.stringify(entry));
		},

		async save(
			userId: string,
			snapshot: AccountingSnapshot,
			expectedVersion?: number | null,
		): Promise<StoredSnapshot> {
			const existing = store.get(userId);
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
			const now = new Date().toISOString();
			const entry: StoredSnapshot = {
				snapshot: {
					...snapshot,
					updatedAt: now,
				},
				version: nextVersion,
				updatedAt: now,
			};

			store.set(userId, entry);
			return JSON.parse(JSON.stringify(entry));
		},
	};
}
