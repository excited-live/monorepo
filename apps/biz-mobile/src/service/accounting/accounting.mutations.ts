import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	addAccount,
	updateAccount,
	deleteAccount,
	addExpense,
	updateExpense,
	deleteExpense,
	addAsset,
	updateAsset,
	deleteAsset,
	addIncome,
	updateIncome,
	deleteIncome,
	setCareerIncome,
	addLiability,
	updateLiability,
	deleteLiability,
	recordTransfer,
	deleteTransfer,
	type Account,
	type AccountingSnapshot,
	type Asset,
	type Expense,
	type Income,
	type Liability,
	type Transfer,
} from "@excited-live/accounting";
import { accountingApi } from "./accounting.api";
import { accountingKeys } from "./accounting.keys";

interface MutationContext {
	previousSnapshot?: AccountingSnapshot;
}

export function useAddAccount() {
	const queryClient = useQueryClient();

	return useMutation<Account, Error, { name: string; imageUrl?: string; id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createAccount(data),
		onMutate: async (newAccount) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = addAccount(previousSnapshot, newAccount);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useUpdateAccount() {
	const queryClient = useQueryClient();

	return useMutation<Account, Error, { id: string; data: Partial<Account> }, MutationContext>({
		mutationFn: ({ id, data }) => accountingApi.updateAccount(id, data),
		onMutate: async ({ id, data }) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					updateAccount(previousSnapshot, id, data),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteAccount() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteAccount(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteAccount(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useAddExpense() {
	const queryClient = useQueryClient();

	return useMutation<Expense, Error, Omit<Expense, "id"> & { id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createExpense(data),
		onMutate: async (newExpense) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = addExpense(previousSnapshot, newExpense);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useUpdateExpense() {
	const queryClient = useQueryClient();

	return useMutation<Expense, Error, Expense, MutationContext>({
		mutationFn: (expense) => accountingApi.updateExpense(expense.id, expense),
		onMutate: async (expense) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					updateExpense(previousSnapshot, expense),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteExpense() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteExpense(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteExpense(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useAddAsset() {
	const queryClient = useQueryClient();

	return useMutation<Asset, Error, Omit<Asset, "id"> & { id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createAsset(data),
		onMutate: async (newAsset) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = addAsset(previousSnapshot, newAsset);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useUpdateAsset() {
	const queryClient = useQueryClient();

	return useMutation<Asset, Error, Asset, MutationContext>({
		mutationFn: (asset) => accountingApi.updateAsset(asset.id, asset),
		onMutate: async (asset) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					updateAsset(previousSnapshot, asset),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteAsset() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteAsset(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteAsset(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useAddIncome() {
	const queryClient = useQueryClient();

	return useMutation<Income, Error, Omit<Income, "id"> & { id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createIncome(data),
		onMutate: async (newIncome) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = addIncome(previousSnapshot, newIncome);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useUpdateIncome() {
	const queryClient = useQueryClient();

	return useMutation<Income, Error, Income, MutationContext>({
		mutationFn: (income) => accountingApi.updateIncome(income.id, income),
		onMutate: async (income) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					updateIncome(previousSnapshot, income),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteIncome() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteIncome(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteIncome(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useSetCareerIncome() {
	const queryClient = useQueryClient();

	return useMutation<
		AccountingSnapshot,
		Error,
		{
			entityId: string;
			salary: number;
			paydayDayOfMonth?: number;
			title?: string;
			company?: string;
			imageUrl?: string;
			startMonth?: string;
			endMonth?: string;
		},
		MutationContext
	>({
		mutationFn: (data) => accountingApi.setCareerIncome(data),
		onMutate: async (command) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					setCareerIncome(previousSnapshot, command),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useAddLiability() {
	const queryClient = useQueryClient();

	return useMutation<Liability, Error, Omit<Liability, "id"> & { id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createLiability(data),
		onMutate: async (newLiability) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = addLiability(previousSnapshot, newLiability);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useUpdateLiability() {
	const queryClient = useQueryClient();

	return useMutation<Liability, Error, Liability, MutationContext>({
		mutationFn: (liability) => accountingApi.updateLiability(liability.id, liability),
		onMutate: async (liability) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					updateLiability(previousSnapshot, liability),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteLiability() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteLiability(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteLiability(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useAddTransfer() {
	const queryClient = useQueryClient();

	return useMutation<Transfer, Error, Omit<Transfer, "id"> & { id?: string }, MutationContext>({
		mutationFn: (data) => accountingApi.createTransfer(data),
		onMutate: async (newTransfer) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				const result = recordTransfer(previousSnapshot, newTransfer);
				queryClient.setQueryData<AccountingSnapshot>(accountingKeys.snapshot(), result.snapshot);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useDeleteTransfer() {
	const queryClient = useQueryClient();

	return useMutation<boolean, Error, string, MutationContext>({
		mutationFn: (id) => accountingApi.deleteTransfer(id),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: accountingKeys.snapshot() });
			const previousSnapshot = queryClient.getQueryData<AccountingSnapshot>(accountingKeys.snapshot());
			if (previousSnapshot) {
				queryClient.setQueryData<AccountingSnapshot>(
					accountingKeys.snapshot(),
					deleteTransfer(previousSnapshot, id),
				);
			}
			return { previousSnapshot };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSnapshot) {
				queryClient.setQueryData(accountingKeys.snapshot(), context.previousSnapshot);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useReplaceSnapshot() {
	const queryClient = useQueryClient();

	return useMutation<AccountingSnapshot, Error, Omit<AccountingSnapshot, "updatedAt">, MutationContext>({
		mutationFn: (data) => accountingApi.replaceSnapshot(data),
		onSuccess: (data) => {
			queryClient.setQueryData(accountingKeys.snapshot(), data);
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}
