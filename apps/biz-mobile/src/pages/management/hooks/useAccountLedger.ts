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

		const rawActions = generateMonthlyLedger({
			account: activeAccount,
			yearMonth: selectedMonth,
			subscriptions,
			hardware,
			revenues,
			transfers,
			liabilities,
		}).actions;

		const monthActions: LedgerActionItem[] = rawActions.map((a) => ({
			id: a.id,
			entityId: activeAccount.id,
			yearMonth: selectedMonth,
			title: a.description,
			date: a.date,
			amount: a.direction === "inflow" ? a.amount : -a.amount,
			type: a.direction,
			category: a.category,
			reference: a.counterparty,
		}));

		return {
			monthActions,
		};
	}, [activeAccount, selectedMonth, subscriptions, hardware, revenues, transfers, liabilities]);
}
