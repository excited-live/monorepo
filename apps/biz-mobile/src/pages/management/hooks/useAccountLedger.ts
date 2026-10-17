import { useMemo } from "react";
import {
	generateMonthlyLedger,
	type EntityAccount,
	type LedgerActionItem,
} from "@excited-live/biz";
import { useFinances } from "../../../state";

export interface AccountLedgerSlice {
	monthActions: LedgerActionItem[];
}

export function useAccountLedger(
	activeAccount: EntityAccount,
	selectedMonth: string,
): AccountLedgerSlice {
	const { subscriptions, hardware, revenues, transfers, liabilities } = useFinances();

	return useMemo(() => {
		if (!activeAccount) {
			return {
				monthActions: [],
			};
		}

		const monthActions = generateMonthlyLedger({
			account: activeAccount,
			yearMonth: selectedMonth,
			subscriptions,
			hardware,
			revenues,
			transfers,
			liabilities,
		}).actions;

		return {
			monthActions,
		};
	}, [activeAccount, selectedMonth, subscriptions, hardware, revenues, transfers, liabilities]);
}
