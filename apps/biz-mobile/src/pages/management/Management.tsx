import React from "react";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import type {
	EntityAccount,
	HardwareAsset,
	LiabilityStream,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/accounting";
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
import {
	useAccount,
	useMonthSelection,
	useAccountLedger,
	useAccountIncome,
	useAccountExpenses,
	useAccountAssets,
	useAccountLiabilities,
	useManagementView,
	useManagementDrawers,
} from "./hooks";

export const Management: React.FC = () => {
	// 1. Core Selection Inputs
	const { accounts, activeEntityId, setActiveEntityId, activeAccount, isPersonal } = useAccount();
	const { selectedMonth } = useMonthSelection();

	// 2. Data Slices (dependent on activeAccount & selectedMonth)
	const { monthActions } = useAccountLedger(activeAccount, selectedMonth);
	const { entityRev, totalIncome, hasConfiguredSalary } = useAccountIncome(activeAccount, selectedMonth);
	const { entitySubs, outgoingTransfers, totalMonthlyExpenses } = useAccountExpenses(activeAccount, selectedMonth);
	const {
		cashWallets,
		gearAssets,
		totalLiquidReserves,
		totalBookValue,
		totalDepreciation,
	} = useAccountAssets(activeAccount, selectedMonth);
	const { entityLiab, totalMonthlyLiabilities } = useAccountLiabilities(activeAccount);

	// 3. View / Mode State
	const {
		userSession,
		lang,
		flipped,
		setFlipped,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		subTabs,
		navigateToSettings,
	} = useManagementView();

	// 4. Drawers State & Actions
	const {
		isCapitalOpen,
		openCapital,
		closeCapital,
		selectedTransfer,
		isEditBizOpen,
		openEditBiz,
		closeEditBiz,
		editBiz,
		isExpenseOpen,
		openExpense,
		closeExpense,
		selectedSub,
		isGearOpen,
		openGear,
		closeGear,
		selectedHw,
		isRevenueOpen,
		openRevenue,
		closeRevenue,
		selectedRev,
		isLiabilityOpen,
		openLiability,
		closeLiability,
		selectedLiab,
	} = useManagementDrawers();

	const handleConfigureBiz = (account: EntityAccount) => {
		openEditBiz(account);
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
				onNavigateToSettings={navigateToSettings}
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
								onInjectCapital={() => openCapital(null)}
								onAddIncome={() => openRevenue(null)}
								onEditIncome={(r: RevenueStream) => openRevenue(r)}
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
								onAddExpense={() => openExpense(null)}
								onEditExpense={(sub: RecurringSubscription) => openExpense(sub)}
								onSelectTransfer={(tr) => openCapital(tr)}
							/>
						)}

						{/* Detail — Assets */}
						{activeCapitalSubTab === "assets" && (
							<ManagementAssetsSection
								activeAccount={activeAccount}
								cashWallets={cashWallets}
								gearAssets={gearAssets}
								totalLiquidReserves={totalLiquidReserves}
								totalBookValue={totalBookValue}
								totalDepreciation={totalDepreciation}
								selectedMonth={selectedMonth}
								lang={lang}
								onAddAsset={() => openGear(null)}
								onSelectHardware={(hw: HardwareAsset) => openGear(hw)}
							/>
						)}

						{/* Detail — Liabilities */}
						{activeCapitalSubTab === "liability" && (
							<ManagementLiabilitySection
								entityLiab={entityLiab}
								totalMonthlyLiabilities={totalMonthlyLiabilities}
								lang={lang}
								onRegisterLiability={() => openLiability(null)}
								onSelectLiability={(liab: LiabilityStream) => openLiability(liab)}
							/>
						)}
					</>
				) : (
					<ManagementLedgerSection
						monthActions={monthActions}
						selectedMonth={selectedMonth}
						lang={lang}
					/>
				)}
			</Stack>

			{/* Drawers & Modals */}
			<CapitalDrawer
				isOpen={isCapitalOpen}
				onClose={closeCapital}
				initialData={selectedTransfer}
			/>
			<AddBusinessDrawer
				isOpen={isEditBizOpen}
				onClose={closeEditBiz}
				initialData={editBiz}
			/>
			<AddExpenseDrawer
				isOpen={isExpenseOpen}
				onClose={closeExpense}
				initialData={selectedSub}
			/>
			<AddGearDrawer
				isOpen={isGearOpen}
				onClose={closeGear}
				initialData={selectedHw}
			/>
			<AddRevenueDrawer
				isOpen={isRevenueOpen}
				onClose={closeRevenue}
				initialData={selectedRev}
			/>
			<AddLiabilityDrawer
				isOpen={isLiabilityOpen}
				onClose={closeLiability}
				initialData={selectedLiab}
			/>
		</Stack>
	);
};
