import { queryOptions, useQueries, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
	AccountingBook,
	MonthlyLedger,
} from "@excited-live/accounting";
import { accountingApi } from "./accounting.api";
import { accountingKeys } from "./accounting.keys";

const LIST_STALE_TIME = 1000 * 60 * 5; // 5 minutes

// One query per resource list. The options are shared by the single-list hooks and by useAccountingBook.
const entitiesQuery = queryOptions({
	queryKey: accountingKeys.entities(),
	queryFn: () => accountingApi.listEntities(),
	staleTime: LIST_STALE_TIME,
});
const assetsQuery = queryOptions({
	queryKey: accountingKeys.assets(),
	queryFn: () => accountingApi.listAssets(),
	staleTime: LIST_STALE_TIME,
});
const incomesQuery = queryOptions({
	queryKey: accountingKeys.incomes(),
	queryFn: () => accountingApi.listIncomes(),
	staleTime: LIST_STALE_TIME,
});
const expensesQuery = queryOptions({
	queryKey: accountingKeys.expenses(),
	queryFn: () => accountingApi.listExpenses(),
	staleTime: LIST_STALE_TIME,
});
const liabilitiesQuery = queryOptions({
	queryKey: accountingKeys.liabilities(),
	queryFn: () => accountingApi.listLiabilities(),
	staleTime: LIST_STALE_TIME,
});
const transfersQuery = queryOptions({
	queryKey: accountingKeys.transfers(),
	queryFn: () => accountingApi.listTransfers(),
	staleTime: LIST_STALE_TIME,
});

export function useEntities() {
	return useQuery(entitiesQuery);
}

export function useAssets() {
	return useQuery(assetsQuery);
}

export function useIncomes() {
	return useQuery(incomesQuery);
}

export function useExpenses() {
	return useQuery(expensesQuery);
}

export function useLiabilities() {
	return useQuery(liabilitiesQuery);
}

export function useTransfers() {
	return useQuery(transfersQuery);
}

/**
 * The whole book: the six resource lists together. `book` is undefined until
 * every list has loaded.
 */
export function useAccountingBook(): { book: AccountingBook | undefined; isLoading: boolean; isError: boolean } {
	const [entities, assets, incomes, expenses, liabilities, transfers] = useQueries({
		queries: [entitiesQuery, assetsQuery, incomesQuery, expensesQuery, liabilitiesQuery, transfersQuery],
	});

	const book = useMemo<AccountingBook | undefined>(() => {
		if (!entities.data || !assets.data || !incomes.data || !expenses.data || !liabilities.data || !transfers.data) {
			return undefined;
		}
		return {
			entities: entities.data,
			assets: assets.data,
			incomes: incomes.data,
			expenses: expenses.data,
			liabilities: liabilities.data,
			transfers: transfers.data,
		};
	}, [entities.data, assets.data, incomes.data, expenses.data, liabilities.data, transfers.data]);

	const results = [entities, assets, incomes, expenses, liabilities, transfers];
	return {
		book,
		isLoading: results.some((result) => result.isPending),
		isError: results.some((result) => result.isError),
	};
}

export function useMonthlyLedger(
	yearMonth: string,
	entityId?: string,
	options?: Omit<UseQueryOptions<MonthlyLedger, Error>, "queryKey" | "queryFn">,
) {
	return useQuery<MonthlyLedger, Error>({
		queryKey: accountingKeys.ledger(yearMonth, entityId),
		queryFn: () => accountingApi.getLedger(yearMonth, entityId),
		enabled: !!yearMonth,
		staleTime: 1000 * 60 * 5,
		...options,
	});
}
