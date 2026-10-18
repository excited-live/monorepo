import {
	commands,
	generateMonthlyLedger,
	type Account,
	type AccountingSnapshot,
	type Asset,
	type Expense,
	type Income,
	type Liability,
	type MonthlyLedger,
	type Transfer,
} from "@excited-live/accounting";
import type { AccountingRepository, StoredSnapshot } from "../domain/accounting.repository";
import { NotFoundError } from "../domain/errors";

export const createEmptySnapshot = (): AccountingSnapshot => ({
	accounts: [
		{
			id: "acc_personal",
			name: "Personal",
			type: "personal",
			cashReserve: 0,
			currency: "THB",
		},
	],
	subscriptions: [],
	hardware: [],
	revenues: [],
	transfers: [],
	liabilities: [],
	updatedAt: new Date().toISOString(),
	isDefault: true,
});

export interface AccountingService {
	getSnapshot(userId: string): Promise<AccountingSnapshot>;
	replaceSnapshot(userId: string, snapshot: Omit<AccountingSnapshot, "updatedAt">): Promise<AccountingSnapshot>;
	addAccount(userId: string, input: { name: string; imageUrl?: string; id?: string }): Promise<Account>;
	updateAccount(userId: string, id: string, update: Partial<Account>): Promise<Account>;
	deleteAccount(userId: string, id: string): Promise<{ ok: boolean }>;
	addExpense(userId: string, input: Omit<Expense, "id"> & { id?: string }): Promise<Expense>;
	updateExpense(userId: string, expense: Expense): Promise<Expense>;
	deleteExpense(userId: string, id: string): Promise<{ ok: boolean }>;
	addAsset(userId: string, input: Omit<Asset, "id"> & { id?: string }): Promise<Asset>;
	updateAsset(userId: string, asset: Asset): Promise<Asset>;
	deleteAsset(userId: string, id: string): Promise<{ ok: boolean }>;
	addIncome(userId: string, input: Omit<Income, "id"> & { id?: string }): Promise<Income>;
	updateIncome(userId: string, income: Income): Promise<Income>;
	deleteIncome(userId: string, id: string): Promise<{ ok: boolean }>;
	setCareerIncome(
		userId: string,
		input: {
			entityId: string;
			salary: number;
			paydayDayOfMonth?: number;
			title?: string;
			company?: string;
			imageUrl?: string;
			startMonth?: string;
			endMonth?: string;
		},
	): Promise<AccountingSnapshot>;
	addLiability(userId: string, input: Omit<Liability, "id"> & { id?: string }): Promise<Liability>;
	updateLiability(userId: string, liability: Liability): Promise<Liability>;
	deleteLiability(userId: string, id: string): Promise<{ ok: boolean }>;
	recordTransfer(
		userId: string,
		input: {
			fromEntityId: string;
			toEntityId: string;
			amount: number;
			date: string;
			note?: string;
			frequency?: "one_time" | "monthly";
			targetAssetId?: string;
			id?: string;
		},
	): Promise<Transfer>;
	deleteTransfer(userId: string, id: string): Promise<{ ok: boolean }>;
	getLedger(userId: string, yearMonth: string, entityId?: string): Promise<MonthlyLedger>;
}

export function createAccountingService(repo: AccountingRepository): AccountingService {
	async function loadOrEmpty(userId: string): Promise<StoredSnapshot> {
		const stored = await repo.load(userId);
		if (stored) return stored;
		return {
			snapshot: createEmptySnapshot(),
			version: 0,
			updatedAt: new Date().toISOString(),
		};
	}

	return {
		async getSnapshot(userId: string): Promise<AccountingSnapshot> {
			const stored = await loadOrEmpty(userId);
			return stored.snapshot;
		},

		async replaceSnapshot(
			userId: string,
			snapshot: Omit<AccountingSnapshot, "updatedAt">,
		): Promise<AccountingSnapshot> {
			const current = await loadOrEmpty(userId);
			const fullSnapshot: AccountingSnapshot = {
				...snapshot,
				isDefault: false,
			};
			const saved = await repo.save(userId, fullSnapshot, current.version);
			return saved.snapshot;
		},

		async addAccount(userId: string, input: { name: string; imageUrl?: string; id?: string }): Promise<Account> {
			const current = await loadOrEmpty(userId);
			const res = commands.addAccount(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.account;
		},

		async updateAccount(userId: string, id: string, update: Partial<Account>): Promise<Account> {
			const current = await loadOrEmpty(userId);
			const target = current.snapshot.accounts.find((a) => a.id === id);
			if (!target) throw new NotFoundError(`Account ${id} not found`);

			const nextSnapshot = commands.updateAccount(current.snapshot, id, update);
			await repo.save(userId, nextSnapshot, current.version);
			return nextSnapshot.accounts.find((a) => a.id === id)!;
		},

		async deleteAccount(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteAccount(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async addExpense(userId: string, input: Omit<Expense, "id"> & { id?: string }): Promise<Expense> {
			const current = await loadOrEmpty(userId);
			const res = commands.addExpense(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.expense;
		},

		async updateExpense(userId: string, expense: Expense): Promise<Expense> {
			const current = await loadOrEmpty(userId);
			const target = current.snapshot.subscriptions.find((s) => s.id === expense.id);
			if (!target) throw new NotFoundError(`Expense ${expense.id} not found`);

			const nextSnapshot = commands.updateExpense(current.snapshot, expense);
			await repo.save(userId, nextSnapshot, current.version);
			return expense;
		},

		async deleteExpense(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteExpense(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async addAsset(userId: string, input: Omit<Asset, "id"> & { id?: string }): Promise<Asset> {
			const current = await loadOrEmpty(userId);
			const res = commands.addAsset(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.asset;
		},

		async updateAsset(userId: string, asset: Asset): Promise<Asset> {
			const current = await loadOrEmpty(userId);
			const target = current.snapshot.hardware.find((h) => h.id === asset.id);
			if (!target) throw new NotFoundError(`Asset ${asset.id} not found`);

			const nextSnapshot = commands.updateAsset(current.snapshot, asset);
			await repo.save(userId, nextSnapshot, current.version);
			return asset;
		},

		async deleteAsset(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteAsset(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async addIncome(userId: string, input: Omit<Income, "id"> & { id?: string }): Promise<Income> {
			const current = await loadOrEmpty(userId);
			const res = commands.addIncome(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.income;
		},

		async updateIncome(userId: string, income: Income): Promise<Income> {
			const current = await loadOrEmpty(userId);
			const target = current.snapshot.revenues.find((r) => r.id === income.id);
			if (!target) throw new NotFoundError(`Income ${income.id} not found`);

			const nextSnapshot = commands.updateIncome(current.snapshot, income);
			await repo.save(userId, nextSnapshot, current.version);
			return income;
		},

		async deleteIncome(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteIncome(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async setCareerIncome(
			userId: string,
			input: {
				entityId: string;
				salary: number;
				paydayDayOfMonth?: number;
				title?: string;
				company?: string;
				imageUrl?: string;
				startMonth?: string;
				endMonth?: string;
			},
		): Promise<AccountingSnapshot> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.setCareerIncome(current.snapshot, input);
			const saved = await repo.save(userId, nextSnapshot, current.version);
			return saved.snapshot;
		},

		async addLiability(userId: string, input: Omit<Liability, "id"> & { id?: string }): Promise<Liability> {
			const current = await loadOrEmpty(userId);
			const res = commands.addLiability(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.liability;
		},

		async updateLiability(userId: string, liability: Liability): Promise<Liability> {
			const current = await loadOrEmpty(userId);
			const target = (current.snapshot.liabilities ?? []).find((l) => l.id === liability.id);
			if (!target) throw new NotFoundError(`Liability ${liability.id} not found`);

			const nextSnapshot = commands.updateLiability(current.snapshot, liability);
			await repo.save(userId, nextSnapshot, current.version);
			return liability;
		},

		async deleteLiability(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteLiability(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async recordTransfer(
			userId: string,
			input: {
				fromEntityId: string;
				toEntityId: string;
				amount: number;
				date: string;
				note?: string;
				frequency?: "one_time" | "monthly";
				targetAssetId?: string;
				id?: string;
			},
		): Promise<Transfer> {
			const current = await loadOrEmpty(userId);
			const res = commands.recordTransfer(current.snapshot, input);
			await repo.save(userId, res.snapshot, current.version);
			return res.transfer;
		},

		async deleteTransfer(userId: string, id: string): Promise<{ ok: boolean }> {
			const current = await loadOrEmpty(userId);
			const nextSnapshot = commands.deleteTransfer(current.snapshot, id);
			await repo.save(userId, nextSnapshot, current.version);
			return { ok: true };
		},

		async getLedger(userId: string, yearMonth: string, entityId?: string): Promise<MonthlyLedger> {
			const current = await loadOrEmpty(userId);
			const account =
				current.snapshot.accounts.find((a) => a.id === entityId) ||
				current.snapshot.accounts[0];

			if (!account) {
				throw new NotFoundError("No account found");
			}

			const raw = generateMonthlyLedger({
				account,
				yearMonth,
				subscriptions: current.snapshot.subscriptions,
				hardware: current.snapshot.hardware,
				revenues: current.snapshot.revenues,
				transfers: current.snapshot.transfers,
				liabilities: current.snapshot.liabilities,
			});

			return {
				yearMonth,
				summary: {
					entityId: account.id,
					yearMonth,
					startingTreasury: raw.summary.startingTreasury,
					endingTreasury: raw.summary.endingTreasury,
					totalInflow: raw.summary.totalInflow,
					totalCashOutflow: raw.summary.totalCashOutflow,
					totalDepreciation: raw.summary.totalDepreciation,
					netCashFlow: raw.summary.netCashFlow,
					runwayMonths: raw.summary.runwayMonths,
					isDefaultAlive: raw.summary.isDefaultAlive,
				},
				actionItems: raw.actions.map((a) => ({
					id: a.id,
					entityId: account.id,
					yearMonth,
					title: a.description,
					date: a.date,
					amount: a.direction === "inflow" ? a.amount : -a.amount,
					type: a.direction,
					category: a.category,
					reference: a.counterparty,
				})),
			};
		},
	};
}
