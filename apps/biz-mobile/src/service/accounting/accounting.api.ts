import type {
	Account,
	AccountingSnapshot,
	Asset,
	Expense,
	Income,
	Liability,
	MonthlyLedger,
	Transfer,
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

const api = accountingClient;

export const accountingApi = {
	async getSnapshot(): Promise<AccountingSnapshot> {
		const res = await api.snapshot.$get();
		if (!res.ok) {
			throw new ApiError("Failed to fetch accounting snapshot", res.status);
		}
		return (await res.json()) as AccountingSnapshot;
	},

	async replaceSnapshot(data: Omit<AccountingSnapshot, "updatedAt">): Promise<AccountingSnapshot> {
		const payload = {
			...data,
			liabilities: data.liabilities ?? [],
		};
		const res = await api.snapshot.$put({ json: payload });
		if (!res.ok) {
			throw new ApiError("Failed to replace accounting snapshot", res.status);
		}
		return (await res.json()) as AccountingSnapshot;
	},

	async createAccount(data: { name: string; imageUrl?: string; id?: string; asOf?: string }): Promise<Account> {
		const res = await api.accounts.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to create account", res.status);
		}
		return (await res.json()) as Account;
	},

	async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
		const res = await api.accounts[":id"].$put({ param: { id }, json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update account", res.status);
		}
		return (await res.json()) as Account;
	},

	async deleteAccount(id: string): Promise<boolean> {
		const res = await api.accounts[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete account", res.status);
		}
		return true;
	},

	async createExpense(data: Omit<Expense, "id"> & { id?: string }): Promise<Expense> {
		const res = await api.expenses.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to create expense", res.status);
		}
		return (await res.json()) as Expense;
	},

	async updateExpense(id: string, data: Expense): Promise<Expense> {
		const res = await api.expenses[":id"].$put({ param: { id }, json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update expense", res.status);
		}
		return (await res.json()) as Expense;
	},

	async deleteExpense(id: string): Promise<boolean> {
		const res = await api.expenses[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete expense", res.status);
		}
		return true;
	},

	async createAsset(data: Omit<Asset, "id"> & { id?: string }): Promise<Asset> {
		const res = await api.assets.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to create asset", res.status);
		}
		return (await res.json()) as Asset;
	},

	async updateAsset(id: string, data: Asset): Promise<Asset> {
		const res = await api.assets[":id"].$put({ param: { id }, json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update asset", res.status);
		}
		return (await res.json()) as Asset;
	},

	async deleteAsset(id: string): Promise<boolean> {
		const res = await api.assets[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete asset", res.status);
		}
		return true;
	},

	async createIncome(data: Omit<Income, "id"> & { id?: string }): Promise<Income> {
		const res = await api.incomes.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to create income", res.status);
		}
		return (await res.json()) as Income;
	},

	async updateIncome(id: string, data: Income): Promise<Income> {
		const res = await api.incomes[":id"].$put({ param: { id }, json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update income", res.status);
		}
		return (await res.json()) as Income;
	},

	async deleteIncome(id: string): Promise<boolean> {
		const res = await api.incomes[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete income", res.status);
		}
		return true;
	},

	async setCareerIncome(data: {
		entityId: string;
		salary: number;
		paydayDayOfMonth?: number;
		title?: string;
		company?: string;
		imageUrl?: string;
		startMonth?: string;
		endMonth?: string;
	}): Promise<AccountingSnapshot> {
		const res = await api.incomes.career.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update career income", res.status);
		}
		return (await res.json()) as AccountingSnapshot;
	},

	async createLiability(data: Omit<Liability, "id"> & { id?: string }): Promise<Liability> {
		const res = await api.liabilities.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to create liability", res.status);
		}
		return (await res.json()) as Liability;
	},

	async updateLiability(id: string, data: Liability): Promise<Liability> {
		const res = await api.liabilities[":id"].$put({ param: { id }, json: data });
		if (!res.ok) {
			throw new ApiError("Failed to update liability", res.status);
		}
		return (await res.json()) as Liability;
	},

	async deleteLiability(id: string): Promise<boolean> {
		const res = await api.liabilities[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete liability", res.status);
		}
		return true;
	},

	async createTransfer(data: Omit<Transfer, "id"> & { id?: string }): Promise<Transfer> {
		const res = await api.transfers.$post({ json: data });
		if (!res.ok) {
			throw new ApiError("Failed to record transfer", res.status);
		}
		return (await res.json()) as Transfer;
	},

	async deleteTransfer(id: string): Promise<boolean> {
		const res = await api.transfers[":id"].$delete({ param: { id } });
		if (!res.ok) {
			throw new ApiError("Failed to delete transfer", res.status);
		}
		return true;
	},

	async getLedger(yearMonth: string, entityId?: string): Promise<MonthlyLedger> {
		const res = await api.ledger[":yearMonth"].$get({
			param: { yearMonth },
			query: { entityId },
		});
		if (!res.ok) {
			throw new ApiError("Failed to fetch ledger", res.status);
		}
		return (await res.json()) as MonthlyLedger;
	},
};
