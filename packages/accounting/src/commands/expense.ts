import type { AccountingSnapshot, Expense } from "../types";

export function addExpense(
	snapshot: AccountingSnapshot,
	input: Omit<Expense, "id"> & { id?: string },
): { snapshot: AccountingSnapshot; expense: Expense } {
	const newExpense: Expense = {
		...input,
		id: input.id ?? `sub_${Date.now()}`,
	};

	return {
		snapshot: {
			...snapshot,
			subscriptions: [...snapshot.subscriptions, newExpense],
		},
		expense: newExpense,
	};
}

export function updateExpense(
	snapshot: AccountingSnapshot,
	expense: Expense,
): AccountingSnapshot {
	return {
		...snapshot,
		subscriptions: snapshot.subscriptions.map((s) =>
			s.id === expense.id ? expense : s,
		),
	};
}

export function deleteExpense(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	return {
		...snapshot,
		subscriptions: snapshot.subscriptions.filter((s) => s.id !== id),
	};
}
