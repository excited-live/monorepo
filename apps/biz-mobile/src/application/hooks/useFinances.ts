import { useCallback, useMemo } from "react";
import {
	assetToBookAsset,
	bookToSnapshot,
	expenseToBookExpense,
	incomeToBookIncome,
	liabilityToBookLiability,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/accounting";
import {
	useAccountingBook,
	useCreateAsset,
	useCreateEntity,
	useCreateExpense,
	useCreateIncome,
	useCreateLiability,
	useCreateTransfer,
	useDeleteAsset,
	useDeleteEntity,
	useDeleteExpense,
	useDeleteIncome,
	useDeleteLiability,
	useDeleteTransfer,
	useSetCareerIncome,
	useUpdateAsset,
	useUpdateEntity,
	useUpdateExpense,
	useUpdateIncome,
	useUpdateLiability,
	useUpdateTransfer,
} from "../../service/accounting";
import {
	careerInput,
	localDay,
	localMonth,
	transferDestination,
	replacing,
	transferEndpointsPatch,
} from "../../service/accounting/accounting.mappers";

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
	addHardware: (hw: Omit<HardwareAsset, "id"> & { id?: string }) => void;
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
	const { book } = useAccountingBook();
	// Engine-shaped lists, derived from the normalized book. Undefined while the book loads.
	const snapshot = useMemo(() => (book ? bookToSnapshot(book) : undefined), [book]);

	const createEntity = useCreateEntity();
	const updateEntity = useUpdateEntity();
	const deleteEntity = useDeleteEntity();

	const createAsset = useCreateAsset();
	const updateAsset = useUpdateAsset();
	const deleteAsset = useDeleteAsset();

	const createIncome = useCreateIncome();
	const updateIncome = useUpdateIncome();
	const deleteIncome = useDeleteIncome();
	const setCareerIncomeMutation = useSetCareerIncome();

	const createExpense = useCreateExpense();
	const updateExpense = useUpdateExpense();
	const deleteExpense = useDeleteExpense();

	const createLiability = useCreateLiability();
	const updateLiabilityMutation = useUpdateLiability();
	const deleteLiabilityMutation = useDeleteLiability();

	const createTransfer = useCreateTransfer();
	const updateTransfer = useUpdateTransfer();
	const deleteTransfer = useDeleteTransfer();

	const accounts = useMemo(() => snapshot?.accounts ?? DEFAULT_ACCOUNTS, [snapshot?.accounts]);
	const subscriptions = useMemo(() => snapshot?.subscriptions ?? [], [snapshot?.subscriptions]);
	const hardware = useMemo(() => snapshot?.hardware ?? [], [snapshot?.hardware]);
	const revenues = useMemo(() => snapshot?.revenues ?? [], [snapshot?.revenues]);
	const liabilities = useMemo(() => snapshot?.liabilities ?? [], [snapshot?.liabilities]);
	const transfers = useMemo(() => snapshot?.transfers ?? [], [snapshot?.transfers]);

	// The owning entity's career fields fill in employment incomes that carry none.
	const ownerOf = useCallback(
		(entityId: string) => accounts.find((account) => account.id === entityId),
		[accounts],
	);

	const addBusiness = useCallback(
		(name: string, imageUrl?: string): string => {
			const id = crypto.randomUUID();
			// Date the new ฿0 wallet to the user's local month, not the server's UTC one
			createEntity.mutate({ id, name, imageUrl, asOf: localMonth(new Date()) });
			return id;
		},
		[createEntity],
	);

	const updateBusiness = useCallback(
		(id: string, name: string, imageUrl?: string) => {
			updateEntity.mutate({ id, patch: { name, imageUrl: imageUrl ?? null } });
		},
		[updateEntity],
	);

	const deleteBusiness = useCallback(
		(id: string) => {
			deleteEntity.mutate(id);
		},
		[deleteEntity],
	);

	const addSubscription = useCallback(
		(sub: Omit<RecurringSubscription, "id">) => {
			createExpense.mutate(expenseToBookExpense({ ...sub, id: crypto.randomUUID() }));
		},
		[createExpense],
	);

	const updateSubscription = useCallback(
		(sub: RecurringSubscription) => {
			updateExpense.mutate({
				id: sub.id,
				patch: replacing(expenseToBookExpense(sub), ["notes", "imageUrl", "endMonth", "dayOfMonth"]),
			});
		},
		[updateExpense],
	);

	const deleteSubscription = useCallback(
		(id: string) => {
			deleteExpense.mutate(id);
		},
		[deleteExpense],
	);

	const addHardware = useCallback(
		(hw: Omit<HardwareAsset, "id"> & { id?: string }) => {
			createAsset.mutate(assetToBookAsset({ ...hw, id: hw.id ?? crypto.randomUUID() }));
		},
		[createAsset],
	);

	const updateHardware = useCallback(
		(hw: HardwareAsset) => {
			const record = assetToBookAsset(hw);
			const current = hardware.find((h) => h.id === hw.id);
			if (current?.kind !== undefined && current.kind !== record.kind) {
				// The API rejects kind changes, so replace the asset. The new record gets a new id.
				// Deleting the asset also drops the transfers into and out of it (see docs/accounting-data-model.md).
				deleteAsset.mutate(hw.id, {
					onSuccess: () => createAsset.mutate({ ...record, id: crypto.randomUUID() }),
				});
				return;
			}
			updateAsset.mutate({ id: hw.id, patch: replacing(record, ["notes", "imageUrl"]) });
		},
		[hardware, createAsset, deleteAsset, updateAsset],
	);

	const deleteHardware = useCallback(
		(id: string) => {
			deleteAsset.mutate(id);
		},
		[deleteAsset],
	);

	const addRevenue = useCallback(
		(rev: Omit<RevenueStream, "id">) => {
			createIncome.mutate(incomeToBookIncome({ ...rev, id: crypto.randomUUID() }, ownerOf(rev.entityId)));
		},
		[createIncome, ownerOf],
	);

	const updateRevenue = useCallback(
		(rev: RevenueStream) => {
			updateIncome.mutate({
				id: rev.id,
				patch: replacing(incomeToBookIncome(rev, ownerOf(rev.entityId)), ["notes", "imageUrl", "endMonth"]),
			});
		},
		[updateIncome, ownerOf],
	);

	const deleteRevenue = useCallback(
		(id: string) => {
			deleteIncome.mutate(id);
		},
		[deleteIncome],
	);

	const addLiability = useCallback(
		(liab: Omit<LiabilityStream, "id">) => {
			createLiability.mutate(liabilityToBookLiability({ ...liab, id: crypto.randomUUID() }));
		},
		[createLiability],
	);

	const updateLiability = useCallback(
		(liab: LiabilityStream) => {
			updateLiabilityMutation.mutate({
				id: liab.id,
				patch: replacing(liabilityToBookLiability(liab), ["notes", "imageUrl", "endMonth"]),
			});
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
			createTransfer.mutate({
				id: crypto.randomUUID(),
				fromEntityId,
				amount,
				date: localDay(new Date()),
				note,
				cycle: frequency,
				...transferDestination(targetAssetId, toEntityId),
			});
		},
		[createTransfer],
	);

	const updateCapitalTransfer = useCallback(
		(transfer: CapitalTransfer) => {
			updateTransfer.mutate({
				id: transfer.id,
				patch: {
					amount: transfer.amount,
					date: transfer.date,
					note: transfer.note,
					cycle: transfer.frequency ?? "one_time",
					...transferEndpointsPatch(transfer),
				},
			});
		},
		[updateTransfer],
	);

	const deleteCapitalTransfer = useCallback(
		(id: string) => {
			deleteTransfer.mutate(id);
		},
		[deleteTransfer],
	);

	const setCareerIncomeAction = useCallback(
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
			setCareerIncomeMutation.mutate(careerInput(entityId, career, revenues));
		},
		[setCareerIncomeMutation, revenues],
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
		setCareerIncome: setCareerIncomeAction,
		updateCareer,
	};
}
