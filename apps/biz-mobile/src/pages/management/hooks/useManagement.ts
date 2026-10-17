import { useState, useEffect } from "react";
import {
	calculateAssetDepreciation,
	calculateCashAssetBalance,
	calculateMonthlyEquivalent,
	generateMonthlyLedger,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	isCashAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
	round2,
} from "@excited-live/biz";
import { useFinances, useAppUI, useUserData } from "../../../state";
import { t } from "../../../utils/i18n";
import type { CapitalSubTab } from "../../../domain/types";

export function useManagement() {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
	} = useFinances();

	const {
		activeEntityId,
		setActiveEntityId,
		setActiveTab,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		lang,
	} = useAppUI();

	const { userSession } = useUserData();

	const [flipped, setFlipped] = useState(false);
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

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	// Capital sub-tab removed in favor of hero derivation; fallback to income if previously set
	useEffect(() => {
		if (activeCapitalSubTab === "capital") {
			setActiveCapitalSubTab("income");
		}
	}, [activeCapitalSubTab, setActiveCapitalSubTab]);

	const monthActions = generateMonthlyLedger({
		account: activeAccount,
		yearMonth: selectedMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
	}).actions;

	// Run-rate inputs for the active entity
	const entitySubs = subscriptions.filter((s) => s.entityId === activeAccount.id && s.active);
	const entityHw = hardware.filter((h) => h.entityId === activeAccount.id);
	const cashAssets = entityHw.filter((h) => isCashAsset(h));
	const gearAssets = entityHw.filter((h) => !isCashAsset(h));
	const entityRev = revenues.filter((r) => {
		if (r.entityId !== activeAccount.id || !r.active) return false;
		if (selectedMonth) {
			if (r.frequency === "one_time") return r.startMonth === selectedMonth;
			if (r.startMonth && selectedMonth < r.startMonth) return false;
			if (r.endMonth && selectedMonth > r.endMonth) return false;
		}
		return true;
	});
	const entityLiab = liabilities.filter((l) => l.entityId === activeAccount.id && l.active);

	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === activeAccount.id && r.source === "salary",
	);
	const legacySalary = !hasConfiguredSalary && activeAccount.type === "personal" ? (activeAccount.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
			entityRev.reduce(
				(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.frequency === "monthly" ? r.amount : 0),
				0,
			),
	);

	// Capital transfers
	const outgoingTransfers = transfers.filter((t) => t.fromEntityId === activeAccount.id);

	// In personal account, seed capital deployed to ventures is treated as an operational expense
	const personalCapitalBurn = isPersonal
		? outgoingTransfers
				.filter((t) => t.date.startsWith(selectedMonth))
				.reduce((acc, t) => acc + t.amount, 0)
		: 0;

	const totalMonthlyExpenses = round2(
		entitySubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
			personalCapitalBurn,
	);

	const totalMonthlyLiabilities = round2(
		entityLiab.reduce((acc, l) => acc + l.amount, 0),
	);

	const totalBookValue = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).remainingBookValue,
			0,
		),
	);

	const totalLiquidReserves = round2(
		cashAssets.reduce((acc, h) => {
			const bal = calculateCashAssetBalance({
				asset: h,
				hardware,
				transfers,
				account: activeAccount,
				subscriptions,
				revenues,
				liabilities,
				yearMonth: selectedMonth,
			});
			return acc + bal.effectiveBalance;
		}, 0),
	);

	const totalDepreciation = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).monthlyRate,
			0,
		),
	);

	const subTabs: Array<{ id: CapitalSubTab; label: string }> = [
		{ id: "income" as CapitalSubTab, label: t("subtab.income", lang) },
		{ id: "expense" as CapitalSubTab, label: t("subtab.expense", lang) },
		{ id: "assets" as CapitalSubTab, label: t("subtab.assets", lang) },
		{ id: "liability" as CapitalSubTab, label: t("subtab.liability", lang) },
	];

	return {
		accounts,
		hardware,
		transfers,
		subscriptions,
		revenues,
		liabilities,
		activeEntityId,
		setActiveEntityId,
		setActiveTab,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		userSession,
		lang,
		activeAccount,
		isPersonal,
		flipped,
		setFlipped,
		monthActions,
		entitySubs,
		cashAssets,
		gearAssets,
		entityRev,
		entityLiab,
		outgoingTransfers,
		totalIncome,
		totalMonthlyExpenses,
		totalMonthlyLiabilities,
		totalBookValue,
		totalLiquidReserves,
		totalDepreciation,
		subTabs,
		hasConfiguredSalary,
		// Drawers state
		isCapitalOpen,
		setIsCapitalOpen,
		selectedTransfer,
		setSelectedTransfer,
		isExpenseOpen,
		setIsExpenseOpen,
		selectedSub,
		setSelectedSub,
		isGearOpen,
		setIsGearOpen,
		selectedHw,
		setSelectedHw,
		isRevenueOpen,
		setIsRevenueOpen,
		selectedRev,
		setSelectedRev,
		isLiabilityOpen,
		setIsLiabilityOpen,
		selectedLiab,
		setSelectedLiab,
		isEditBizOpen,
		setIsEditBizOpen,
		editBiz,
		setEditBiz,
	};
}
