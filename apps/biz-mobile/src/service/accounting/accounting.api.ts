import type {
	BookAsset,
	BookEntity,
	BookExpense,
	BookIncome,
	BookLiability,
	BookTransfer,
	MonthlyLedger,
	Stored,
} from "@excited-live/accounting";
import { accountingClient } from "../http/client";

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

/** Body of POST /entities. The server also creates the business's default cash wallet. */
export interface CreateEntityInput {
	id: string;
	name: string;
	imageUrl?: string;
	/** Local month (YYYY-MM) the new wallet is dated to. */
	asOf?: string;
}

/** Body of POST /transfers. Each end is an asset id, or an entity (its default cash wallet). */
export interface CreateTransferInput {
	id: string;
	amount: number;
	date: string;
	cycle?: BookTransfer["cycle"];
	note?: string;
	fromAssetId?: string;
	fromEntityId?: string;
	toAssetId?: string;
	toEntityId?: string;
	toLiabilityId?: string;
}

/** Body of PATCH /transfers/:id. Naming a destination re-resolves that side. */
/** PATCH body: any subset of fields; null clears an optional field. */
export type Patch<T> = { [K in keyof T]?: undefined extends T[K] ? T[K] | null : T[K] };

export type UpdateTransferInput = Partial<Omit<CreateTransferInput, "id">>;

/** Body of POST /incomes/career: sets the entity's primary salary. */
export interface SetCareerInput {
	entityId: string;
	salary: number;
	paydayDayOfMonth?: number;
	title?: string;
	company?: string;
	imageUrl?: string;
	startMonth?: string;
	endMonth?: string;
}

interface RawResponse {
	ok: boolean;
	status: number;
	json: () => Promise<unknown>;
}

async function parse<T>(res: RawResponse, message: string): Promise<T> {
	if (!res.ok) {
		throw new ApiError(message, res.status);
	}
	return (await res.json()) as T;
}

function check(res: RawResponse, message: string): void {
	if (!res.ok) {
		throw new ApiError(message, res.status);
	}
}

const api = accountingClient;

// The POST bodies are discriminated by `kind`, while the book records carry the kind as a union. The
// converters set only the fields of each record's own kind, so the cast only narrows the type.
type IncomeBody = Parameters<(typeof api.incomes)["$post"]>[0]["json"];
type LiabilityBody = Parameters<(typeof api.liabilities)["$post"]>[0]["json"];

export const accountingApi = {
	// ENTITIES
	async listEntities(): Promise<Stored<BookEntity>[]> {
		return parse<Stored<BookEntity>[]>(await api.entities.$get(), "Failed to load entities");
	},

	async createEntity(data: CreateEntityInput): Promise<Stored<BookEntity>> {
		return parse<Stored<BookEntity>>(await api.entities.$post({ json: data }), "Failed to create entity");
	},

	async updateEntity(id: string, patch: Patch<BookEntity>): Promise<Stored<BookEntity>> {
		return parse<Stored<BookEntity>>(
			await api.entities[":id"].$patch({ param: { id }, json: patch }),
			"Failed to update entity",
		);
	},

	async deleteEntity(id: string): Promise<void> {
		check(await api.entities[":id"].$delete({ param: { id } }), "Failed to delete entity");
	},

	// ASSETS
	async listAssets(): Promise<Stored<BookAsset>[]> {
		return parse<Stored<BookAsset>[]>(await api.assets.$get({ query: {} }), "Failed to load assets");
	},

	async createAsset(data: BookAsset): Promise<Stored<BookAsset>> {
		return parse<Stored<BookAsset>>(await api.assets.$post({ json: data }), "Failed to create asset");
	},

	async updateAsset(id: string, patch: Patch<BookAsset>): Promise<Stored<BookAsset>> {
		return parse<Stored<BookAsset>>(
			await api.assets[":id"].$patch({ param: { id }, json: patch }),
			"Failed to update asset",
		);
	},

	async deleteAsset(id: string): Promise<void> {
		check(await api.assets[":id"].$delete({ param: { id } }), "Failed to delete asset");
	},

	// INCOMES
	async listIncomes(): Promise<Stored<BookIncome>[]> {
		return parse<Stored<BookIncome>[]>(await api.incomes.$get({ query: {} }), "Failed to load incomes");
	},

	async createIncome(data: BookIncome): Promise<Stored<BookIncome>> {
		return parse<Stored<BookIncome>>(
			await api.incomes.$post({ json: data as IncomeBody }),
			"Failed to create income",
		);
	},

	async updateIncome(id: string, patch: Patch<BookIncome>): Promise<Stored<BookIncome>> {
		return parse<Stored<BookIncome>>(
			// Nested detail objects merge on the server; the RPC type has no null for them.
			await api.incomes[":id"].$patch({ param: { id }, json: patch as never }),
			"Failed to update income",
		);
	},

	async deleteIncome(id: string): Promise<void> {
		check(await api.incomes[":id"].$delete({ param: { id } }), "Failed to delete income");
	},

	async setCareerIncome(data: SetCareerInput): Promise<unknown> {
		return parse<unknown>(await api.incomes.career.$post({ json: data }), "Failed to update career income");
	},

	// EXPENSES
	async listExpenses(): Promise<Stored<BookExpense>[]> {
		return parse<Stored<BookExpense>[]>(await api.expenses.$get({ query: {} }), "Failed to load expenses");
	},

	async createExpense(data: BookExpense): Promise<Stored<BookExpense>> {
		return parse<Stored<BookExpense>>(await api.expenses.$post({ json: data }), "Failed to create expense");
	},

	async updateExpense(id: string, patch: Patch<BookExpense>): Promise<Stored<BookExpense>> {
		return parse<Stored<BookExpense>>(
			await api.expenses[":id"].$patch({ param: { id }, json: patch }),
			"Failed to update expense",
		);
	},

	async deleteExpense(id: string): Promise<void> {
		check(await api.expenses[":id"].$delete({ param: { id } }), "Failed to delete expense");
	},

	// LIABILITIES
	async listLiabilities(): Promise<Stored<BookLiability>[]> {
		return parse<Stored<BookLiability>[]>(
			await api.liabilities.$get({ query: {} }),
			"Failed to load liabilities",
		);
	},

	async createLiability(data: BookLiability): Promise<Stored<BookLiability>> {
		return parse<Stored<BookLiability>>(
			await api.liabilities.$post({ json: data as LiabilityBody }),
			"Failed to create liability",
		);
	},

	async updateLiability(id: string, patch: Patch<BookLiability>): Promise<Stored<BookLiability>> {
		return parse<Stored<BookLiability>>(
			// Nested detail objects merge on the server; the RPC type has no null for them.
			await api.liabilities[":id"].$patch({ param: { id }, json: patch as never }),
			"Failed to update liability",
		);
	},

	async deleteLiability(id: string): Promise<void> {
		check(await api.liabilities[":id"].$delete({ param: { id } }), "Failed to delete liability");
	},

	// TRANSFERS
	async listTransfers(): Promise<Stored<BookTransfer>[]> {
		return parse<Stored<BookTransfer>[]>(await api.transfers.$get(), "Failed to load transfers");
	},

	async createTransfer(data: CreateTransferInput): Promise<Stored<BookTransfer>> {
		return parse<Stored<BookTransfer>>(await api.transfers.$post({ json: data }), "Failed to record transfer");
	},

	async updateTransfer(id: string, patch: UpdateTransferInput): Promise<Stored<BookTransfer>> {
		return parse<Stored<BookTransfer>>(
			await api.transfers[":id"].$patch({ param: { id }, json: patch }),
			"Failed to update transfer",
		);
	},

	async deleteTransfer(id: string): Promise<void> {
		check(await api.transfers[":id"].$delete({ param: { id } }), "Failed to delete transfer");
	},

	// COMPUTED
	async getLedger(yearMonth: string, entityId?: string): Promise<MonthlyLedger> {
		return parse<MonthlyLedger>(
			await api.ledger[":yearMonth"].$get({ param: { yearMonth }, query: { entityId } }),
			"Failed to fetch ledger",
		);
	},
};
