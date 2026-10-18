import { useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type {
	BookAsset,
	BookEntity,
	BookExpense,
	BookIncome,
	BookLiability,
	BookTransfer,
	Stored,
} from "@excited-live/accounting";
import {
	accountingApi,
	type CreateEntityInput,
	type CreateTransferInput,
	type Patch,
	type SetCareerInput,
	type UpdateTransferInput,
} from "./accounting.api";
import { accountingKeys } from "./accounting.keys";
import { defaultCashAssetId, primaryEmploymentIncome } from "./accounting.mappers";

type Row = { id: string };
type Rows<T> = Stored<T>[];

interface ListSnapshot {
	queryKey: QueryKey;
	rows: unknown;
}

interface WriteOptions<TVars, T extends Row> {
	/** The list the write edits optimistically. */
	list: QueryKey;
	write: (vars: TVars) => Promise<unknown>;
	/** Cache edit applied before the request. Not run while the list is still loading. */
	optimistic?: (rows: Rows<T>, vars: TVars, queryClient: QueryClient) => Rows<T>;
	/** Other lists the write changes on the server (cascades), refetched once it settles. */
	refresh?: QueryKey[];
}

/**
 * One write: optimistic edit of `list`, rollback on error, and a refetch of the
 * touched lists plus the computed views (ledger, summary, cash flows) on settle.
 */
function useWrite<TVars, T extends Row>({ list, write, optimistic, refresh = [] }: WriteOptions<TVars, T>) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, TVars, ListSnapshot>({
		mutationFn: write,
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey: list });
			const snapshot: ListSnapshot = { queryKey: list, rows: queryClient.getQueryData(list) };
			if (optimistic) {
				queryClient.setQueryData<Rows<T>>(list, (rows) => (rows ? optimistic(rows, vars, queryClient) : rows));
			}
			return snapshot;
		},
		onError: (_error, _vars, snapshot) => {
			if (snapshot) {
				queryClient.setQueryData(snapshot.queryKey, snapshot.rows);
			}
		},
		onSettled: () => {
			const computed: QueryKey[] = [[...accountingKeys.all, "ledger"], accountingKeys.summary(), accountingKeys.cashFlows()];
			for (const queryKey of [list, ...refresh, ...computed]) {
				queryClient.invalidateQueries({ queryKey });
			}
		},
	});
}

const nowIso = () => new Date().toISOString();

/** Adds the stored-record meta fields to an optimistic row; a previous row keeps its own. */
function withMeta<T extends Row>(row: T, previous?: Stored<T>): Stored<T> {
	const at = nowIso();
	return { ...row, version: previous?.version ?? 1, createdAt: previous?.createdAt ?? at, updatedAt: at };
}

function upsertRow<T extends Row>(rows: Rows<T>, row: T): Rows<T> {
	const previous = rows.find((r) => r.id === row.id);
	const stored = withMeta(row, previous);
	return previous ? rows.map((r) => (r.id === row.id ? stored : r)) : [...rows, stored];
}

/** Merges a partial update as the server does: undefined keeps a field, null clears it. */
function patchRow<T extends Row>(rows: Rows<T>, id: string, patch: Patch<T> | Partial<T>): Rows<T> {
	return rows.map((r) => {
		if (r.id !== id) return r;
		const next: Record<string, unknown> = { ...r, updatedAt: nowIso() };
		for (const [key, value] of Object.entries(patch)) {
			if (value === undefined) continue;
			if (value === null) delete next[key];
			else next[key] = value;
		}
		return next as unknown as Stored<T>;
	});
}

function removeRow<T extends Row>(rows: Rows<T>, id: string): Rows<T> {
	return rows.filter((r) => r.id !== id);
}

// ENTITIES

export function useCreateEntity() {
	return useWrite<CreateEntityInput, BookEntity>({
		list: accountingKeys.entities(),
		write: (data) => accountingApi.createEntity(data),
		optimistic: (rows, data) =>
			upsertRow(rows, {
				id: data.id,
				name: data.name,
				imageUrl: data.imageUrl,
				type: "business",
				currency: "THB",
				active: true,
			}),
		// The server creates the business's default wallet with it.
		refresh: [accountingKeys.assets()],
	});
}

export function useUpdateEntity() {
	return useWrite<{ id: string; patch: Patch<BookEntity> }, BookEntity>({
		list: accountingKeys.entities(),
		write: ({ id, patch }) => accountingApi.updateEntity(id, patch),
		optimistic: (rows, { id, patch }) => patchRow(rows, id, patch),
	});
}

export function useDeleteEntity() {
	return useWrite<string, BookEntity>({
		list: accountingKeys.entities(),
		write: (id) => accountingApi.deleteEntity(id),
		optimistic: (rows, id) => removeRow(rows, id),
		// Deleting an entity cascades to every record it owns.
		refresh: [
			accountingKeys.assets(),
			accountingKeys.incomes(),
			accountingKeys.expenses(),
			accountingKeys.liabilities(),
			accountingKeys.transfers(),
		],
	});
}

// ASSETS

export function useCreateAsset() {
	return useWrite<BookAsset, BookAsset>({
		list: accountingKeys.assets(),
		write: (data) => accountingApi.createAsset(data),
		optimistic: (rows, data) => upsertRow(rows, data),
		// paidFrom creates a purchase transfer and financing creates a loan, in the same write.
		refresh: [accountingKeys.transfers(), accountingKeys.liabilities()],
	});
}

export function useUpdateAsset() {
	return useWrite<{ id: string; patch: Patch<BookAsset> }, BookAsset>({
		list: accountingKeys.assets(),
		write: ({ id, patch }) => accountingApi.updateAsset(id, patch),
		optimistic: (rows, { id, patch }) => patchRow(rows, id, patch),
	});
}

export function useDeleteAsset() {
	return useWrite<string, BookAsset>({
		list: accountingKeys.assets(),
		write: (id) => accountingApi.deleteAsset(id),
		optimistic: (rows, id) => removeRow(rows, id),
		// Transfers are removed with the asset; incomes, expenses and liabilities are removed or unlinked.
		refresh: [
			accountingKeys.incomes(),
			accountingKeys.expenses(),
			accountingKeys.liabilities(),
			accountingKeys.transfers(),
		],
	});
}

// INCOMES

export function useCreateIncome() {
	return useWrite<BookIncome, BookIncome>({
		list: accountingKeys.incomes(),
		write: (data) => accountingApi.createIncome(data),
		optimistic: (rows, data) => upsertRow(rows, data),
	});
}

export function useUpdateIncome() {
	return useWrite<{ id: string; patch: Patch<BookIncome> }, BookIncome>({
		list: accountingKeys.incomes(),
		write: ({ id, patch }) => accountingApi.updateIncome(id, patch),
		optimistic: (rows, { id, patch }) => patchRow(rows, id, patch),
	});
}

export function useDeleteIncome() {
	return useWrite<string, BookIncome>({
		list: accountingKeys.incomes(),
		write: (id) => accountingApi.deleteIncome(id),
		optimistic: (rows, id) => removeRow(rows, id),
		// Expenses that cost this income are unlinked (SET NULL).
		refresh: [accountingKeys.expenses()],
	});
}

export function useSetCareerIncome() {
	return useWrite<SetCareerInput, BookIncome>({
		list: accountingKeys.incomes(),
		write: (data) => accountingApi.setCareerIncome(data),
		optimistic: (rows, input) => {
			const primary = primaryEmploymentIncome(rows, input.entityId);
			if (!primary) return rows;
			return patchRow(rows, primary.id, {
				amount: input.salary,
				active: input.salary > 0,
				dayOfMonth: input.paydayDayOfMonth,
				imageUrl: input.imageUrl,
				employment: {
					title: input.title ?? primary.employment?.title,
					employer: input.company ?? primary.employment?.employer,
				},
			});
		},
	});
}

// EXPENSES

export function useCreateExpense() {
	return useWrite<BookExpense, BookExpense>({
		list: accountingKeys.expenses(),
		write: (data) => accountingApi.createExpense(data),
		optimistic: (rows, data) => upsertRow(rows, data),
	});
}

export function useUpdateExpense() {
	return useWrite<{ id: string; patch: Patch<BookExpense> }, BookExpense>({
		list: accountingKeys.expenses(),
		write: ({ id, patch }) => accountingApi.updateExpense(id, patch),
		optimistic: (rows, { id, patch }) => patchRow(rows, id, patch),
	});
}

export function useDeleteExpense() {
	return useWrite<string, BookExpense>({
		list: accountingKeys.expenses(),
		write: (id) => accountingApi.deleteExpense(id),
		optimistic: (rows, id) => removeRow(rows, id),
	});
}

// LIABILITIES

export function useCreateLiability() {
	return useWrite<BookLiability, BookLiability>({
		list: accountingKeys.liabilities(),
		write: (data) => accountingApi.createLiability(data),
		optimistic: (rows, data) => upsertRow(rows, data),
	});
}

export function useUpdateLiability() {
	return useWrite<{ id: string; patch: Patch<BookLiability> }, BookLiability>({
		list: accountingKeys.liabilities(),
		write: ({ id, patch }) => accountingApi.updateLiability(id, patch),
		optimistic: (rows, { id, patch }) => patchRow(rows, id, patch),
	});
}

export function useDeleteLiability() {
	return useWrite<string, BookLiability>({
		list: accountingKeys.liabilities(),
		write: (id) => accountingApi.deleteLiability(id),
		optimistic: (rows, id) => removeRow(rows, id),
		// Card charges and transfers into the liability are unlinked or removed.
		refresh: [accountingKeys.expenses(), accountingKeys.transfers()],
	});
}

// TRANSFERS

export function useCreateTransfer() {
	return useWrite<CreateTransferInput, BookTransfer>({
		list: accountingKeys.transfers(),
		write: (data) => accountingApi.createTransfer(data),
		optimistic: (rows, input, queryClient) => {
			// Resolve the endpoints the way the server does; leave the row out when they cannot be resolved.
			const assets = queryClient.getQueryData<Stored<BookAsset>[]>(accountingKeys.assets()) ?? [];
			const fromAssetId =
				input.fromAssetId ?? (input.fromEntityId ? defaultCashAssetId(assets, input.fromEntityId) : undefined);
			const toLiabilityId = input.toLiabilityId;
			const toAssetId = toLiabilityId
				? undefined
				: (input.toAssetId ?? (input.toEntityId ? defaultCashAssetId(assets, input.toEntityId) : undefined));
			if (!fromAssetId || (!toLiabilityId && !toAssetId)) return rows;
			return upsertRow(rows, {
				id: input.id,
				amount: input.amount,
				date: input.date,
				cycle: input.cycle ?? "one_time",
				note: input.note ?? "",
				fromAssetId,
				toAssetId,
				toLiabilityId,
			});
		},
	});
}

export function useUpdateTransfer() {
	return useWrite<{ id: string; patch: UpdateTransferInput }, BookTransfer>({
		list: accountingKeys.transfers(),
		write: ({ id, patch }) => accountingApi.updateTransfer(id, patch),
		// Endpoint changes are re-resolved by the server; the refetch shows them.
		optimistic: (rows, { id, patch }) =>
			patchRow(rows, id, { amount: patch.amount, date: patch.date, cycle: patch.cycle, note: patch.note }),
	});
}

export function useDeleteTransfer() {
	return useWrite<string, BookTransfer>({
		list: accountingKeys.transfers(),
		write: (id) => accountingApi.deleteTransfer(id),
		optimistic: (rows, id) => removeRow(rows, id),
	});
}
