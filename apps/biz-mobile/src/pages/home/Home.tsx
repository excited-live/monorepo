import React from "react";
import { Stack } from "@excited-live/design-system";
import { AddBusinessDrawer } from "../../components/AddBusinessDrawer";
import { AddRevenueDrawer } from "../../components/AddRevenueDrawer";
import {
	CareerDrawer,
	HomeAppSection,
	HomeCareerOnboarding,
	HomeEntitiesSection,
	HomeHeroBackground,
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
		needsCareer,
		totalTreasury,
		totalEomTreasury,
		personalCash,
		businessCash,
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
		setActiveEntityId,
		setActiveTab,
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

				{/* Entities Section */}
				<HomeEntitiesSection
					accounts={accounts}
					lang={lang}
					onAddBusiness={() => {
						setSelectedBiz(null);
						setIsDrawerOpen(true);
					}}
					onSelectAccount={handleSelectAccount}
					onOpenCareerEdit={openCareerEdit}
					eomTreasury={eomTreasury}
					formatType={formatType}
					calculatePaydayCountdown={calculatePaydayCountdown}
				/>

				{/* Onboarding — add career income when missing */}
				{needsCareer && (
					<HomeCareerOnboarding
						onAddCareer={() => {
							setActiveEntityId("acc_personal");
							setIsCareerOpen(true);
						}}
					/>
				)}
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
		</Stack>
	);
};
