import { useAccountingSnapshot, useReplaceSnapshot } from "../../service/accounting";
import type { AccountingSnapshot } from "@excited-live/accounting";

export interface CloudSyncSlice {
	cloudSyncStatus?: "syncing" | "synced" | "error";
	lastSyncedAt: string | null;
	syncWithCloud: () => Promise<void>;
	restoreBackup: (data: AccountingSnapshot) => void;
}

export function useCloudSync(): CloudSyncSlice {
	const { isFetching, dataUpdatedAt, refetch } = useAccountingSnapshot();
	const replaceMutation = useReplaceSnapshot();

	const cloudSyncStatus = isFetching ? "syncing" : "synced";
	const lastSyncedAt = dataUpdatedAt
		? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		: null;

	const syncWithCloud = async () => {
		await refetch();
	};

	const restoreBackup = (data: AccountingSnapshot) => {
		replaceMutation.mutate(data);
	};

	return {
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		restoreBackup,
	};
}
