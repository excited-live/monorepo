import { useCallback, useMemo } from "react";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";
import {
	useAccountingSnapshot,
	useAddAccount,
	useUpdateAccount,
	useDeleteAccount,
	useAddExpense,
	useUpdateExpense,
	useDeleteExpense,
	useAddAsset,
	useUpdateAsset,
	useDeleteAsset,
	useAddIncome,
	useUpdateIncome,
	useDeleteIncome,
	useSetCareerIncome,
	useAddLiability,
	useUpdateLiability,
	useDeleteLiability,
	useAddTransfer,
	useDeleteTransfer,
} from "../../service/accounting";

export interface FinancesSlice {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	liabilities: LiabilityStream[];
	transfers: CapitalTransfer[];
	addBusiness: (name: string, imageUrl?: string) => string;
	updateBusiness: (id: string, name: string, imageUrl?: string) => void;
	deleteBusiness: (id: string) => void;
	addSubscription: (sub: Omit<RecurringSubscription, "id">) => void;
	updateSubscription: (sub: RecurringSubscription) => void;
	deleteSubscription: (id: string) => void;
	addHardware: (hw: Omit<HardwareAsset, "id">) => void;
	updateHardware: (hw: HardwareAsset) => void;
	deleteHardware: (id: string) => void;
	addRevenue: (rev: Omit<RevenueStream, "id">) => void;
	updateRevenue: (rev: RevenueStream) => void;
	deleteRevenue: (id: string) => void;
	addLiability: (liab: Omit<LiabilityStream, "id">) => void;
	updateLiability: (liab: LiabilityStream) => void;
	deleteLiability: (id: string) => void;
	injectCapital: (
		fromEntityId: string,
		toEntityId: string,
		amount: number,
		note?: string,
		frequency?: "one_time" | "monthly",
		targetAssetId?: string,
	) => void;
	updateCapitalTransfer: (transfer: CapitalTransfer) => void;
	deleteCapitalTransfer: (id: string) => void;
	setCareerIncome: (
		entityId: string,
		salary: number,
		paydayDayOfMonth?: number,
		title?: string,
		company?: string,
		imageUrl?: string,
		startMonth?: string,
		endMonth?: string,
	) => void;
	updateCareer: (
		entityId: string,
		career: {
			careerTitle?: string;
			careerCompany?: string;
			careerImageUrl?: string;
			salary?: number;
			paydayDayOfMonth?: number;
		},
	) => void;
}

const DEFAULT_ACCOUNTS: EntityAccount[] = [
	{
		id: "acc_personal",
		name: "Personal",
		type: "personal",
		cashReserve: 0,
		currency: "THB",
		active: true,
	},
];

export function useFinances(): FinancesSlice {
	const { data: snapshot } = useAccountingSnapshot();

	const addAccountMutation = useAddAccount();
	const updateAccountMutation = useUpdateAccount();
	const deleteAccountMutation = useDeleteAccount();

	const addExpenseMutation = useAddExpense();
	const updateExpenseMutation = useUpdateExpense();
	const deleteExpenseMutation = useDeleteExpense();

	const addAssetMutation = useAddAsset();
	const updateAssetMutation = useUpdateAsset();
	const deleteAssetMutation = useDeleteAsset();

	const addIncomeMutation = useAddIncome();
	const updateIncomeMutation = useUpdateIncome();
	const deleteIncomeMutation = useDeleteIncome();
	const setCareerIncomeMutation = useSetCareerIncome();

	const addLiabilityMutation = useAddLiability();
	const updateLiabilityMutation = useUpdateLiability();
	const deleteLiabilityMutation = useDeleteLiability();

	const addTransferMutation = useAddTransfer();
	const deleteTransferMutation = useDeleteTransfer();

	const accounts = useMemo(() => snapshot?.accounts ?? DEFAULT_ACCOUNTS, [snapshot?.accounts]);
	const subscriptions = useMemo(() => snapshot?.subscriptions ?? [], [snapshot?.subscriptions]);
	const hardware = useMemo(() => snapshot?.hardware ?? [], [snapshot?.hardware]);
	const revenues = useMemo(() => snapshot?.revenues ?? [], [snapshot?.revenues]);
	const liabilities = useMemo(() => snapshot?.liabilities ?? [], [snapshot?.liabilities]);
	const transfers = useMemo(() => snapshot?.transfers ?? [], [snapshot?.transfers]);

	const addBusiness = useCallback(
		(name: string, imageUrl?: string): string => {
			const id = `acc_biz_${Date.now()}`;
			const now = new Date();
			// Date the new ฿0 wallet to the user's local month, not the server's UTC one
			const asOf = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			addAccountMutation.mutate({ id, name, imageUrl, asOf });
			return id;
		},
		[addAccountMutation],
	);

	const updateBusiness = useCallback(
		(id: string, name: string, imageUrl?: string) => {
			updateAccountMutation.mutate({ id, data: { name, imageUrl } });
		},
		[updateAccountMutation],
	);

	const deleteBusiness = useCallback(
		(id: string) => {
			deleteAccountMutation.mutate(id);
		},
		[deleteAccountMutation],
	);

	const addSubscription = useCallback(
		(sub: Omit<RecurringSubscription, "id">) => {
			addExpenseMutation.mutate(sub);
		},
		[addExpenseMutation],
	);

	const updateSubscription = useCallback(
		(sub: RecurringSubscription) => {
			updateExpenseMutation.mutate(sub);
		},
		[updateExpenseMutation],
	);

	const deleteSubscription = useCallback(
		(id: string) => {
			deleteExpenseMutation.mutate(id);
		},
		[deleteExpenseMutation],
	);

	const addHardware = useCallback(
		(hw: Omit<HardwareAsset, "id">) => {
			addAssetMutation.mutate(hw);
		},
		[addAssetMutation],
	);

	const updateHardware = useCallback(
		(hw: HardwareAsset) => {
			updateAssetMutation.mutate(hw);
		},
		[updateAssetMutation],
	);

	const deleteHardware = useCallback(
		(id: string) => {
			deleteAssetMutation.mutate(id);
		},
		[deleteAssetMutation],
	);

	const addRevenue = useCallback(
		(rev: Omit<RevenueStream, "id">) => {
			addIncomeMutation.mutate(rev);
		},
		[addIncomeMutation],
	);

	const updateRevenue = useCallback(
		(rev: RevenueStream) => {
			updateIncomeMutation.mutate(rev);
		},
		[updateIncomeMutation],
	);

	const deleteRevenue = useCallback(
		(id: string) => {
			deleteIncomeMutation.mutate(id);
		},
		[deleteIncomeMutation],
	);

	const addLiability = useCallback(
		(liab: Omit<LiabilityStream, "id">) => {
			addLiabilityMutation.mutate(liab);
		},
		[addLiabilityMutation],
	);

	const updateLiability = useCallback(
		(liab: LiabilityStream) => {
			updateLiabilityMutation.mutate(liab);
		},
		[updateLiabilityMutation],
	);

	const deleteLiability = useCallback(
		(id: string) => {
			deleteLiabilityMutation.mutate(id);
		},
		[deleteLiabilityMutation],
	);

	const injectCapital = useCallback(
		(
			fromEntityId: string,
			toEntityId: string,
			amount: number,
			note = "Capital transfer",
			frequency: "one_time" | "monthly" = "one_time",
			targetAssetId?: string,
		) => {
			const now = new Date();
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, "0");
			const d = String(now.getDate()).padStart(2, "0");
			addTransferMutation.mutate({
				fromEntityId,
				toEntityId,
				amount,
				date: `${y}-${m}-${d}`,
				note,
				frequency,
				targetAssetId,
			});
		},
		[addTransferMutation],
	);

	const updateCapitalTransfer = useCallback(
		(transfer: CapitalTransfer) => {
			// For transfer update, delete old and add new or record
			deleteTransferMutation.mutate(transfer.id, {
				onSuccess: () => {
					addTransferMutation.mutate(transfer);
				},
			});
		},
		[addTransferMutation, deleteTransferMutation],
	);

	const deleteCapitalTransfer = useCallback(
		(id: string) => {
			deleteTransferMutation.mutate(id);
		},
		[deleteTransferMutation],
	);

	const setCareerIncome = useCallback(
		(
			entityId: string,
			salary: number,
			paydayDayOfMonth?: number,
			title?: string,
			company?: string,
			imageUrl?: string,
			startMonth?: string,
			endMonth?: string,
		) => {
			setCareerIncomeMutation.mutate({
				entityId,
				salary,
				paydayDayOfMonth,
				title,
				company,
				imageUrl,
				startMonth,
				endMonth,
			});
		},
		[setCareerIncomeMutation],
	);

	const updateCareer = useCallback(
		(
			entityId: string,
			career: {
				careerTitle?: string;
				careerCompany?: string;
				careerImageUrl?: string;
				salary?: number;
				paydayDayOfMonth?: number;
			},
		) => {
			updateAccountMutation.mutate({ id: entityId, data: career });
		},
		[updateAccountMutation],
	);

	return {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		addBusiness,
		updateBusiness,
		deleteBusiness,
		addSubscription,
		updateSubscription,
		deleteSubscription,
		addHardware,
		updateHardware,
		deleteHardware,
		addRevenue,
		updateRevenue,
		deleteRevenue,
		addLiability,
		updateLiability,
		deleteLiability,
		injectCapital,
		updateCapitalTransfer,
		deleteCapitalTransfer,
		setCareerIncome,
		updateCareer,
	};
}
