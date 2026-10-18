import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AccountingSnapshot, MonthlyLedger } from "@excited-live/accounting";
import { accountingApi } from "./accounting.api";
import { accountingKeys } from "./accounting.keys";

export function useAccountingSnapshot(
	options?: Omit<UseQueryOptions<AccountingSnapshot, Error>, "queryKey" | "queryFn">,
) {
	return useQuery<AccountingSnapshot, Error>({
		queryKey: accountingKeys.snapshot(),
		queryFn: () => accountingApi.getSnapshot(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		...options,
	});
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
