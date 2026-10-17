import React from "react";
import type { EntityAccount } from "@excited-live/biz";
import type { UserSession } from "../../../../domain/types";
import { CapitalHeroCard } from "../CapitalHeroCard";
import { LedgerHeroCard } from "../LedgerHeroCard";
import { HeroCarousel } from "../HeroCarousel";
import { FIXTURE_USER_SESSION } from "../../../../testing/fixtures";

export interface ManagementHeroSectionProps {
	accounts: EntityAccount[];
	activeEntityId: string;
	activeAccount: EntityAccount;
	userSession?: UserSession;
	flipped?: boolean;
	selectedMonth?: string;
	onSelectEntity?: (id: string) => void;
	onFlipToLedger?: () => void;
	onFlipToCapital?: () => void;
	onConfigureBiz?: (account: EntityAccount) => void;
	onNavigateToSettings?: () => void;
}

export const ManagementHeroSection: React.FC<ManagementHeroSectionProps> = ({
	accounts,
	activeEntityId,
	activeAccount,
	userSession = FIXTURE_USER_SESSION,
	flipped = false,
	selectedMonth = "2026-10",
	onSelectEntity = () => {},
	onFlipToLedger = () => {},
	onFlipToCapital = () => {},
	onConfigureBiz = () => {},
	onNavigateToSettings = () => {},
}) => {
	const bgImg =
		activeAccount.type === "personal"
			? (activeAccount.careerImageUrl || activeAccount.imageUrl || userSession?.avatarUrl)
			: activeAccount.imageUrl;

	return (
		<>
			{/* Full-width background image */}
			{bgImg ? (
				<div className="capital-hero-bg-wrapper">
					<img
						src={bgImg}
						alt={activeAccount.name}
						className="capital-hero-bg-image"
					/>
					<div className="capital-hero-bg-scrim" />
				</div>
			) : null}

			{/* Floating Hero Card: upper 80% over org background, lower 20% over app sheet */}
			<div className="capital-hero-card-container">
				<div className={`hero-flip ${flipped ? "flipped" : ""}`}>
					<div className="hero-flip-inner">
						<div className="hero-flip-face front">
							<HeroCarousel
								accounts={accounts}
								activeEntityId={activeEntityId}
								onSelectEntity={onSelectEntity}
								onTap={onFlipToLedger}
								renderCard={(account) => (
									<CapitalHeroCard
										account={account}
										onConfigure={() => {
											if (account.type === "business") {
												onConfigureBiz(account);
											}
										}}
										onPersonalSettings={onNavigateToSettings}
										onTap={onFlipToLedger}
									/>
								)}
							/>
						</div>

						<div className="hero-flip-face back">
							<HeroCarousel
								accounts={accounts}
								activeEntityId={activeEntityId}
								onSelectEntity={onSelectEntity}
								onTap={onFlipToCapital}
								renderCard={(account) => (
									<LedgerHeroCard
										account={account}
										yearMonth={selectedMonth}
										onTap={onFlipToCapital}
									/>
								)}
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
