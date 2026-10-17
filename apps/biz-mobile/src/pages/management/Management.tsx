import React from "react";
import { SegmentedControl, SegmentedControlItem, Stack } from "@excited-live/design-system";
import type {
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";
import { AddBusinessDrawer } from "../../components/AddBusinessDrawer";
import { AddRevenueDrawer } from "../../components/AddRevenueDrawer";
import {
	AddExpenseDrawer,
	AddGearDrawer,
	AddLiabilityDrawer,
	CapitalDrawer,
	ManagementAssetsSection,
	ManagementExpenseSection,
	ManagementHeroSection,
	ManagementIncomeSection,
	ManagementLedgerSection,
	ManagementLiabilitySection,
	MonthStepper,
} from "./components";
import { useManagement } from "./hooks";

export const Management: React.FC = () => {
	const {
		accounts,
		hardware,
		transfers,
		subscriptions,
		revenues,
		liabilities,
		selectedMonth,
		userSession,
		activeEntityId,
		setActiveEntityId,
		activeAccount,
		flipped,
		setFlipped,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		lang,
		isExpenseOpen,
		setIsExpenseOpen,
		selectedSub,
		setSelectedSub,
		isGearOpen,
		setIsGearOpen,
		selectedHw,
		setSelectedHw,
		isEditBizOpen,
		setIsEditBizOpen,
		editBiz,
		setEditBiz,
		isRevenueOpen,
		setIsRevenueOpen,
		selectedRev,
		setSelectedRev,
		isLiabilityOpen,
		setIsLiabilityOpen,
		selectedLiab,
		setSelectedLiab,
		isCapitalOpen,
		setIsCapitalOpen,
		selectedTransfer,
		setSelectedTransfer,
		isPersonal,
		cashAssets,
		gearAssets,
		totalLiquidReserves,
		totalBookValue,
		totalDepreciation,
		entitySubs,
		totalMonthlyExpenses,
		entityRev,
		totalIncome,
		hasConfiguredSalary,
		entityLiab,
		totalMonthlyLiabilities,
		monthActions,
		outgoingTransfers,
		setActiveTab,
		subTabs,
	} = useManagement();

	const handleConfigureBiz = (account: EntityAccount) => {
		setEditBiz(account);
		setIsEditBizOpen(true);
	};

	const handleNavigateToSettings = () => {
		setActiveTab("settings");
	};

	return (
		<Stack width="100%" className="relative min-h-0 flex-1">
			<ManagementHeroSection
				accounts={accounts}
				activeEntityId={activeEntityId}
				activeAccount={activeAccount}
				userSession={userSession}
				flipped={flipped}
				selectedMonth={selectedMonth}
				onSelectEntity={setActiveEntityId}
				onFlipToLedger={() => setFlipped(true)}
				onFlipToCapital={() => setFlipped(false)}
				onConfigureBiz={handleConfigureBiz}
				onNavigateToSettings={handleNavigateToSettings}
			/>

			{/* Main App Section (Sheet) */}
			<Stack
				gap={4}
				className="relative z-10 -mt-[105px] -mb-[var(--dock-clearance)] -mx-4 w-[calc(100%+32px)] flex-1 rounded-t-[32px] border-t border-line bg-lifted px-4 pt-[130px] pb-[calc(40px+var(--dock-clearance))] shadow-[0_-12px_32px_-4px_rgba(20,20,19,0.08)]"
			>
				{/* Global Month Navigator accessible in all subtabs and views */}
				<MonthStepper />

				{!flipped ? (
					<>
						{/* Detail Mode Switcher */}
						<SegmentedControl
							label="Detail view"
							layout="fill"
							value={activeCapitalSubTab}
							onChange={(v) => setActiveCapitalSubTab(v as typeof activeCapitalSubTab)}
						>
							{subTabs.map((tab) => (
								<SegmentedControlItem key={tab.id} value={tab.id} label={tab.label} />
							))}
						</SegmentedControl>

						{/* Detail — Income */}
						{activeCapitalSubTab === "income" && (
							<ManagementIncomeSection
								isPersonal={isPersonal}
								activeAccount={activeAccount}
								entityRev={entityRev}
								totalIncome={totalIncome}
								hasConfiguredSalary={hasConfiguredSalary}
								lang={lang}
								onInjectCapital={() => {
									setSelectedTransfer(null);
									setIsCapitalOpen(true);
								}}
								onAddIncome={() => {
									setSelectedRev(null);
									setIsRevenueOpen(true);
								}}
								onEditIncome={(r: RevenueStream) => {
									setSelectedRev(r);
									setIsRevenueOpen(true);
								}}
							/>
						)}

						{/* Detail — Expenses */}
						{activeCapitalSubTab === "expense" && (
							<ManagementExpenseSection
								isPersonal={isPersonal}
								entitySubs={entitySubs}
								outgoingTransfers={outgoingTransfers}
								totalMonthlyExpenses={totalMonthlyExpenses}
								lang={lang}
								onAddExpense={() => {
									setSelectedSub(null);
									setIsExpenseOpen(true);
								}}
								onEditExpense={(sub: RecurringSubscription) => {
									setSelectedSub(sub);
									setIsExpenseOpen(true);
								}}
								onSelectTransfer={(tr) => {
									setSelectedTransfer(tr);
									setIsCapitalOpen(true);
								}}
							/>
						)}

						{/* Detail — Assets */}
						{activeCapitalSubTab === "assets" && (
							<ManagementAssetsSection
								activeAccount={activeAccount}
								hardware={hardware}
								transfers={transfers}
								subscriptions={subscriptions}
								revenues={revenues}
								liabilities={liabilities}
								selectedMonth={selectedMonth}
								cashAssets={cashAssets}
								gearAssets={gearAssets}
								totalLiquidReserves={totalLiquidReserves}
								totalBookValue={totalBookValue}
								totalDepreciation={totalDepreciation}
								lang={lang}
								onAddAsset={() => {
									setSelectedHw(null);
									setIsGearOpen(true);
								}}
								onSelectHardware={(hw: HardwareAsset) => {
									setSelectedHw(hw);
									setIsGearOpen(true);
								}}
							/>
						)}

						{/* Detail — Liabilities */}
						{activeCapitalSubTab === "liability" && (
							<ManagementLiabilitySection
								entityLiab={entityLiab}
								totalMonthlyLiabilities={totalMonthlyLiabilities}
								lang={lang}
								onRegisterLiability={() => {
									setSelectedLiab(null);
									setIsLiabilityOpen(true);
								}}
								onSelectLiability={(liab: LiabilityStream) => {
									setSelectedLiab(liab);
									setIsLiabilityOpen(true);
								}}
							/>
						)}
					</>
				) : (
					<ManagementLedgerSection monthActions={monthActions} selectedMonth={selectedMonth} lang={lang} />
				)}
			</Stack>

			{/* Drawers & Modals */}
			<CapitalDrawer
				isOpen={isCapitalOpen}
				onClose={() => {
					setIsCapitalOpen(false);
					setSelectedTransfer(null);
				}}
				initialData={selectedTransfer}
			/>
			<AddBusinessDrawer
				isOpen={isEditBizOpen}
				onClose={() => {
					setIsEditBizOpen(false);
					setEditBiz(null);
				}}
				initialData={editBiz}
			/>
			<AddExpenseDrawer
				isOpen={isExpenseOpen}
				onClose={() => {
					setIsExpenseOpen(false);
					setSelectedSub(null);
				}}
				initialData={selectedSub}
			/>
			<AddGearDrawer
				isOpen={isGearOpen}
				onClose={() => {
					setIsGearOpen(false);
					setSelectedHw(null);
				}}
				initialData={selectedHw}
			/>
			<AddRevenueDrawer
				isOpen={isRevenueOpen}
				onClose={() => {
					setIsRevenueOpen(false);
					setSelectedRev(null);
				}}
				initialData={selectedRev}
			/>
			<AddLiabilityDrawer
				isOpen={isLiabilityOpen}
				onClose={() => {
					setIsLiabilityOpen(false);
					setSelectedLiab(null);
				}}
				initialData={selectedLiab}
			/>
		</Stack>
	);
};
