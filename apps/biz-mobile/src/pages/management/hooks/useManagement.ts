import { useAccount } from "./useAccount";
import { useMonthSelection } from "./useMonthSelection";
import { useManagementMetrics } from "./useManagementMetrics";
import { useManagementView } from "./useManagementView";
import { useManagementDrawers } from "./useManagementDrawers";

export function useManagement() {
	const { accounts, activeAccount, activeEntityId, setActiveEntityId, isPersonal } = useAccount();
	const { selectedMonth, setSelectedMonth } = useMonthSelection();
	const metrics = useManagementMetrics(activeAccount, selectedMonth);
	const view = useManagementView();
	const drawers = useManagementDrawers();

	return {
		accounts,
		activeEntityId,
		setActiveEntityId,
		activeAccount,
		isPersonal,
		selectedMonth,
		setSelectedMonth,
		...metrics,
		...view,
		...drawers,
	};
}
