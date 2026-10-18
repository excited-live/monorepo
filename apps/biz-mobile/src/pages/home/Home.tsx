import React from "react";
import { Stack } from "@astryxdesign/core/Stack";
import { AddBusinessDrawer } from "../../components/AddBusinessDrawer";
import { AddRevenueDrawer } from "../../components/AddRevenueDrawer";
import { AddExpenseDrawer } from "../management/components/AddExpenseDrawer";
import { AddGearDrawer } from "../management/components/AddGearDrawer";
import { AddLiabilityDrawer } from "../management/components/AddLiabilityDrawer";
import {
	CareerDrawer,
	HomeAppSection,
	HomeEntitiesSection,
	HomeHeroBackground,
	HomeOnboardingChecklist,
	HomeTreasuryPanel,
} from "./components";
import { useHome } from "./hooks";

export interface HomeProps {
	onSelectAccount?: (id: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectAccount }) => {
	const {
		accounts,
		lang,
		totalTreasury,
		totalEomTreasury,
		personalCash,
		businessCash,
		openingTreasury,
		eomTreasury,
		openCareerEdit,
		formatType,
		calculatePaydayCountdown,
		isDrawerOpen,
		setIsDrawerOpen,
		selectedBiz,
		setSelectedBiz,
		isRevenueOpen,
		setIsRevenueOpen,
		isCareerOpen,
		setIsCareerOpen,
		careerStream,
		setCareerStream,
		isExpenseOpen,
		setIsExpenseOpen,
		selectedExpense,
		setSelectedExpense,
		isGearOpen,
		setIsGearOpen,
		selectedGear,
		setSelectedGear,
		isLiabilityOpen,
		setIsLiabilityOpen,
		selectedLiability,
		setSelectedLiability,
		setActiveEntityId,
		setActiveTab,
		onboardingSteps,
		onboardingActiveIndex,
		onboardingComplete,
		onboardingCompletedCount,
		isLiabilityResolved,
		completeStep,
		skipStep,
		handleAddEntry,
		handleEditEntry,
		handleReopenStep,
		handleOpenAddBusiness,
		handleSkipLiability,
	} = useHome();

	const handleSelectAccount = (id: string) => {
		setActiveEntityId(id);
		setActiveTab("capital");
		onSelectAccount?.(id);
	};

	return (
		<Stack width="100%" className="relative min-h-0 flex-1">
			{/* Full-width Background Hero Illustration */}
			<HomeHeroBackground />

			{/* Main App Section (Sheet) rising below background */}
			<HomeAppSection>
				{/* Total Asset / Consolidated Treasury info */}
				<HomeTreasuryPanel
					totalTreasury={totalTreasury}
					totalEomTreasury={totalEomTreasury}
					personalCash={personalCash}
					businessCash={businessCash}
					lang={lang}
				/>

				{/* Onboarding Stepper — guided setup with back / skip per step */}
				<HomeOnboardingChecklist
					steps={onboardingSteps}
					activeIndex={onboardingActiveIndex}
					isComplete={onboardingComplete}
					completedCount={onboardingCompletedCount}
					onCompleteStep={completeStep}
					onSkipStep={skipStep}
					onReopenStep={handleReopenStep}
					onAddEntry={handleAddEntry}
					onEditEntry={handleEditEntry}
				/>

				{/* Entities Section */}
				<HomeEntitiesSection
					accounts={accounts}
					lang={lang}
					onAddBusiness={handleOpenAddBusiness}
					onSelectAccount={handleSelectAccount}
					onOpenCareerEdit={openCareerEdit}
					openingTreasury={openingTreasury}
					eomTreasury={eomTreasury}
					formatType={formatType}
					calculatePaydayCountdown={calculatePaydayCountdown}
				/>
			</HomeAppSection>

			{/* Drawers */}
			<AddBusinessDrawer
				isOpen={isDrawerOpen}
				onClose={() => {
					setIsDrawerOpen(false);
					setSelectedBiz(null);
				}}
				initialData={selectedBiz}
			/>
			<CareerDrawer isOpen={isCareerOpen} onClose={() => setIsCareerOpen(false)} />
			<AddRevenueDrawer
				isOpen={isRevenueOpen}
				onClose={() => {
					setIsRevenueOpen(false);
					setCareerStream(null);
				}}
				initialData={careerStream}
			/>
			<AddExpenseDrawer
				isOpen={isExpenseOpen}
				onClose={() => {
					setIsExpenseOpen(false);
					setSelectedExpense(null);
				}}
				initialData={selectedExpense}
			/>
			<AddGearDrawer
				isOpen={isGearOpen}
				onClose={() => {
					setIsGearOpen(false);
					setSelectedGear(null);
				}}
				initialData={selectedGear}
			/>
			<AddLiabilityDrawer
				isOpen={isLiabilityOpen}
				onClose={() => {
					setIsLiabilityOpen(false);
					setSelectedLiability(null);
				}}
				initialData={selectedLiability}
				canSkip={!isLiabilityResolved}
				onSkip={handleSkipLiability}
			/>
		</Stack>
	);
};
