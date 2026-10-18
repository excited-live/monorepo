import { useMemo } from "react";
import {
	calculateMonthlyEquivalent,
	round2,
	type CapitalTransfer,
	type EntityAccount,
	type RecurringSubscription,
} from "@excited-live/accounting";
import { useFinances } from "../../../state";

export interface AccountExpensesSlice {
	entitySubs: RecurringSubscription[];
	outgoingTransfers: CapitalTransfer[];
	totalMonthlyExpenses: number;
}

export function useAccountExpenses(
	activeAccount: EntityAccount,
	selectedMonth: string,
): AccountExpensesSlice {
	const { subscriptions, transfers } = useFinances();
	const isPersonal = activeAccount?.type === "personal";

	return useMemo(() => {
		if (!activeAccount) {
			return {
				entitySubs: [],
				outgoingTransfers: [],
				totalMonthlyExpenses: 0,
			};
		}

		const entitySubs = subscriptions.filter((s) => s.entityId === activeAccount.id && s.active);
		const outgoingTransfers = transfers.filter((t) => t.fromEntityId === activeAccount.id);

		// In personal account, seed capital deployed to ventures is treated as an operational expense
		const personalCapitalBurn = isPersonal
			? outgoingTransfers
					.filter((t) => t.date.startsWith(selectedMonth))
					.reduce((acc, t) => acc + t.amount, 0)
			: 0;

		const totalMonthlyExpenses = round2(
			entitySubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
				personalCapitalBurn,
		);

		return {
			entitySubs,
			outgoingTransfers,
			totalMonthlyExpenses,
		};
	}, [activeAccount, selectedMonth, subscriptions, transfers, isPersonal]);
}
