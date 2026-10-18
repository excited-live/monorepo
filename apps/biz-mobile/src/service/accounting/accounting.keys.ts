export const accountingKeys = {
	all: ["accounting"] as const,
	snapshot: () => [...accountingKeys.all, "snapshot"] as const,
	ledger: (yearMonth: string, entityId?: string) =>
		[...accountingKeys.all, "ledger", yearMonth, entityId ?? "default"] as const,
};
