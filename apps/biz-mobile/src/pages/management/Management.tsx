import React from "react";
import type { EntityAccount, HardwareAsset, LiabilityStream, RecurringSubscription, RevenueStream } from "@excited-live/biz";
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
		<div className="capital-page-layout">
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
			<div className="capital-app-sheet">
				{/* Global Month Navigator accessible in all subtabs and views */}
				<MonthStepper />

				{!flipped ? (
					<>
						{/* Detail Mode Switcher */}
						<div className="sub-tab-switcher">
							{subTabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									className={`sub-tab-btn ${activeCapitalSubTab === tab.id ? "active" : ""}`}
									onClick={() => setActiveCapitalSubTab(tab.id)}
								>
									{tab.label}
								</button>
							))}
						</div>

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
					<ManagementLedgerSection
						monthActions={monthActions}
						selectedMonth={selectedMonth}
						lang={lang}
					/>
				)}
			</div>

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
		</div>
	);
};
