import { useState } from "react";
import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";

export interface ManagementDrawersSlice {
	isCapitalOpen: boolean;
	setIsCapitalOpen: (open: boolean) => void;
	selectedTransfer: CapitalTransfer | null;
	setSelectedTransfer: (transfer: CapitalTransfer | null) => void;
	openCapital: (transfer?: CapitalTransfer | null) => void;
	closeCapital: () => void;

	isExpenseOpen: boolean;
	setIsExpenseOpen: (open: boolean) => void;
	selectedSub: RecurringSubscription | null;
	setSelectedSub: (sub: RecurringSubscription | null) => void;
	openExpense: (sub?: RecurringSubscription | null) => void;
	closeExpense: () => void;

	isGearOpen: boolean;
	setIsGearOpen: (open: boolean) => void;
	selectedHw: HardwareAsset | null;
	setSelectedHw: (hw: HardwareAsset | null) => void;
	openGear: (hw?: HardwareAsset | null) => void;
	closeGear: () => void;

	isRevenueOpen: boolean;
	setIsRevenueOpen: (open: boolean) => void;
	selectedRev: RevenueStream | null;
	setSelectedRev: (rev: RevenueStream | null) => void;
	openRevenue: (rev?: RevenueStream | null) => void;
	closeRevenue: () => void;

	isLiabilityOpen: boolean;
	setIsLiabilityOpen: (open: boolean) => void;
	selectedLiab: LiabilityStream | null;
	setSelectedLiab: (liab: LiabilityStream | null) => void;
	openLiability: (liab?: LiabilityStream | null) => void;
	closeLiability: () => void;

	isEditBizOpen: boolean;
	setIsEditBizOpen: (open: boolean) => void;
	editBiz: EntityAccount | null;
	setEditBiz: (biz: EntityAccount | null) => void;
	openEditBiz: (biz?: EntityAccount | null) => void;
	closeEditBiz: () => void;
}

export function useManagementDrawers(): ManagementDrawersSlice {
	const [isCapitalOpen, setIsCapitalOpen] = useState(false);
	const [selectedTransfer, setSelectedTransfer] = useState<CapitalTransfer | null>(null);

	const [isExpenseOpen, setIsExpenseOpen] = useState(false);
	const [selectedSub, setSelectedSub] = useState<RecurringSubscription | null>(null);

	const [isGearOpen, setIsGearOpen] = useState(false);
	const [selectedHw, setSelectedHw] = useState<HardwareAsset | null>(null);

	const [isRevenueOpen, setIsRevenueOpen] = useState(false);
	const [selectedRev, setSelectedRev] = useState<RevenueStream | null>(null);

	const [isLiabilityOpen, setIsLiabilityOpen] = useState(false);
	const [selectedLiab, setSelectedLiab] = useState<LiabilityStream | null>(null);

	const [isEditBizOpen, setIsEditBizOpen] = useState(false);
	const [editBiz, setEditBiz] = useState<EntityAccount | null>(null);

	return {
		isCapitalOpen,
		setIsCapitalOpen,
		selectedTransfer,
		setSelectedTransfer,
		openCapital: (transfer = null) => {
			setSelectedTransfer(transfer);
			setIsCapitalOpen(true);
		},
		closeCapital: () => {
			setIsCapitalOpen(false);
			setSelectedTransfer(null);
		},

		isExpenseOpen,
		setIsExpenseOpen,
		selectedSub,
		setSelectedSub,
		openExpense: (sub = null) => {
			setSelectedSub(sub);
			setIsExpenseOpen(true);
		},
		closeExpense: () => {
			setIsExpenseOpen(false);
			setSelectedSub(null);
		},

		isGearOpen,
		setIsGearOpen,
		selectedHw,
		setSelectedHw,
		openGear: (hw = null) => {
			setSelectedHw(hw);
			setIsGearOpen(true);
		},
		closeGear: () => {
			setIsGearOpen(false);
			setSelectedHw(null);
		},

		isRevenueOpen,
		setIsRevenueOpen,
		selectedRev,
		setSelectedRev,
		openRevenue: (rev = null) => {
			setSelectedRev(rev);
			setIsRevenueOpen(true);
		},
		closeRevenue: () => {
			setIsRevenueOpen(false);
			setSelectedRev(null);
		},

		isLiabilityOpen,
		setIsLiabilityOpen,
		selectedLiab,
		setSelectedLiab,
		openLiability: (liab = null) => {
			setSelectedLiab(liab);
			setIsLiabilityOpen(true);
		},
		closeLiability: () => {
			setIsLiabilityOpen(false);
			setSelectedLiab(null);
		},

		isEditBizOpen,
		setIsEditBizOpen,
		editBiz,
		setEditBiz,
		openEditBiz: (biz = null) => {
			setEditBiz(biz);
			setIsEditBizOpen(true);
		},
		closeEditBiz: () => {
			setIsEditBizOpen(false);
			setEditBiz(null);
		},
	};
}
