import type { Account, AccountingSnapshot, Asset } from "../types";

export function addAccount(
	snapshot: AccountingSnapshot,
	input: { name: string; imageUrl?: string; id?: string; asOf?: string },
): { snapshot: AccountingSnapshot; account: Account; defaultWallet: Asset } {
	const newId = input.id ?? `acc_biz_${Date.now()}`;
	const newAccount: Account = {
		id: newId,
		name: input.name,
		type: "business",
		cashReserve: 0,
		currency: "THB",
		imageUrl: input.imageUrl,
	};

	const walletId = `hw_wallet_${Date.now()}`;
	const defaultWallet: Asset = {
		id: walletId,
		entityId: newId,
		name: `${input.name} Main Wallet`,
		cost: 0,
		lifespanMonths: 0,
		purchaseDate: input.asOf ?? "2026-10",
		category: "cash",
		isDefault: true,
	};

	return {
		snapshot: {
			...snapshot,
			accounts: [...snapshot.accounts, newAccount],
			hardware: [...snapshot.hardware, defaultWallet],
		},
		account: newAccount,
		defaultWallet,
	};
}

export function updateAccount(
	snapshot: AccountingSnapshot,
	id: string,
	update: Partial<Account>,
): AccountingSnapshot {
	return {
		...snapshot,
		accounts: snapshot.accounts.map((acc) =>
			acc.id === id ? { ...acc, ...update } : acc,
		),
	};
}

export function deleteAccount(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	return {
		...snapshot,
		accounts: snapshot.accounts.filter((acc) => acc.id !== id),
		subscriptions: snapshot.subscriptions.filter((s) => s.entityId !== id),
		hardware: snapshot.hardware.filter((h) => h.entityId !== id),
		revenues: snapshot.revenues.filter((r) => r.entityId !== id),
		liabilities: (snapshot.liabilities ?? []).filter((l) => l.entityId !== id),
		transfers: snapshot.transfers.filter(
			(t) => t.fromEntityId !== id && t.toEntityId !== id,
		),
	};
}
