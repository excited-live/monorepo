export const accountingKeys = {
	all: ["accounting"] as const,
	entities: () => [...accountingKeys.all, "entities"] as const,
	assets: () => [...accountingKeys.all, "assets"] as const,
	incomes: () => [...accountingKeys.all, "incomes"] as const,
	expenses: () => [...accountingKeys.all, "expenses"] as const,
	liabilities: () => [...accountingKeys.all, "liabilities"] as const,
	transfers: () => [...accountingKeys.all, "transfers"] as const,
	ledger: (yearMonth: string, entityId?: string) =>
		[...accountingKeys.all, "ledger", yearMonth, entityId ?? "default"] as const,
	summary: () => [...accountingKeys.all, "summary"] as const,
	cashFlows: () => [...accountingKeys.all, "cash-flows"] as const,
};
