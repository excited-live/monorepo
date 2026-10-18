import type { AccountingSnapshot } from "@excited-live/accounting";

export interface StoredSnapshot {
	snapshot: AccountingSnapshot;
	version: number;
	updatedAt: string;
}

export interface AccountingRepository {
	load(userId: string): Promise<StoredSnapshot | null>;
	save(
		userId: string,
		snapshot: AccountingSnapshot,
		expectedVersion?: number | null,
	): Promise<StoredSnapshot>;
}
