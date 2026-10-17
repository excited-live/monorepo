import type { EntityAccount } from "@excited-live/biz";
import { useAccountLedger, type AccountLedgerSlice } from "./useAccountLedger";
import { useAccountIncome, type AccountIncomeSlice } from "./useAccountIncome";
import { useAccountExpenses, type AccountExpensesSlice } from "./useAccountExpenses";
import { useAccountAssets, type AccountAssetsSlice } from "./useAccountAssets";
import { useAccountLiabilities, type AccountLiabilitiesSlice } from "./useAccountLiabilities";

export type ManagementMetricsSlice = AccountLedgerSlice &
	AccountIncomeSlice &
	AccountExpensesSlice &
	AccountAssetsSlice &
	AccountLiabilitiesSlice;

export function useManagementMetrics(
	activeAccount: EntityAccount,
	selectedMonth: string,
): ManagementMetricsSlice {
	const ledger = useAccountLedger(activeAccount, selectedMonth);
	const income = useAccountIncome(activeAccount, selectedMonth);
	const expenses = useAccountExpenses(activeAccount, selectedMonth);
	const assets = useAccountAssets(activeAccount, selectedMonth);
	const liabilities = useAccountLiabilities(activeAccount);

	return {
		...ledger,
		...income,
		...expenses,
		...assets,
		...liabilities,
	};
}
