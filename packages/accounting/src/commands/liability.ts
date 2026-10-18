import type { AccountingSnapshot, Liability } from "../types";

export function addLiability(
	snapshot: AccountingSnapshot,
	input: Omit<Liability, "id"> & { id?: string },
): { snapshot: AccountingSnapshot; liability: Liability } {
	const newLiability: Liability = {
		...input,
		id: input.id ?? `liab_${Date.now()}`,
	};

	return {
		snapshot: {
			...snapshot,
			liabilities: [...(snapshot.liabilities ?? []), newLiability],
		},
		liability: newLiability,
	};
}

export function updateLiability(
	snapshot: AccountingSnapshot,
	liability: Liability,
): AccountingSnapshot {
	return {
		...snapshot,
		liabilities: (snapshot.liabilities ?? []).map((l) =>
			l.id === liability.id ? liability : l,
		),
	};
}

export function deleteLiability(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	return {
		...snapshot,
		liabilities: (snapshot.liabilities ?? []).filter((l) => l.id !== id),
	};
}
