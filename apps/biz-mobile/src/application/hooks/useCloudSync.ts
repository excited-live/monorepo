import { useBiz } from "../context/useBiz";
import type {
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
	CapitalTransfer,
} from "@excited-live/accounting";
import type { UserSession } from "../../domain/types";

export interface CloudSyncSlice {
	cloudSyncStatus: "synced" | "syncing" | "error";
	lastSyncedAt: string | null;
	syncWithCloud: () => Promise<void>;
	restoreBackup: (data: {
		accounts?: EntityAccount[];
		subscriptions?: RecurringSubscription[];
		hardware?: HardwareAsset[];
		revenues?: RevenueStream[];
		liabilities?: LiabilityStream[];
		transfers?: CapitalTransfer[];
		user?: UserSession;
	}) => void;
	resetToBaseline: () => void;
}

export function useCloudSync(): CloudSyncSlice {
	const {
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		restoreBackup,
		resetToBaseline,
	} = useBiz();

	return {
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		restoreBackup,
		resetToBaseline,
	};
}
