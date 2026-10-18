import React from "react";
import { Img } from "@excited-live/design-system";
import { Stack } from "@astryxdesign/core/Stack";
import type { EntityAccount } from "@excited-live/biz";
import type { UserSession } from "../../../../domain/types";
import { CapitalHeroCard } from "../CapitalHeroCard";
import { LedgerHeroCard } from "../LedgerHeroCard";
import { HeroCarousel } from "../HeroCarousel";
import { FIXTURE_USER_SESSION } from "../../../../testing/fixtures";

const FACE_SHOWN = "pointer-events-auto z-[2]";
const FACE_HIDDEN = "pointer-events-none invisible absolute inset-0 z-[1] opacity-0";

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
			? activeAccount.careerImageUrl || activeAccount.imageUrl || userSession?.avatarUrl
			: activeAccount.imageUrl;

	return (
		<>
			{/* Full-width background image */}
			{bgImg ? (
				<Stack className="absolute top-0 -right-4 -left-4 z-[1] mt-[calc(-1*(56px+max(0px,env(safe-area-inset-top)-14px)))] h-[calc(440px+max(0px,env(safe-area-inset-top)))] w-[calc(100%+32px)] overflow-hidden bg-ink">
					<Img
						src={bgImg}
						alt={activeAccount.name}
						className="block size-full object-cover object-[center_30%] [filter:brightness(0.85)_saturate(1.2)]"
					/>
					<Stack className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,19,0.35)_0%,rgba(20,20,19,0.08)_35%,rgba(20,20,19,0.2)_65%,rgba(252,251,250,0.95)_100%)]" />
				</Stack>
			) : null}

			{/* Floating Hero Card: upper 80% over org background, lower 20% over app sheet */}
			<Stack className="relative z-[15] mt-2 w-full">
				<Stack className="w-full min-w-0 [perspective:1400px]">
					<Stack
						className={`!grid transition-transform duration-[550ms] ease-[cubic-bezier(0.35,0.15,0.25,1)] [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
					>
						<Stack
							className={`min-w-0 [backface-visibility:hidden] [grid-area:1/1] ${flipped ? FACE_HIDDEN : FACE_SHOWN}`}
						>
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
						</Stack>

						<Stack
							className={`min-w-0 [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)] ${flipped ? FACE_SHOWN : FACE_HIDDEN}`}
						>
							<HeroCarousel
								accounts={accounts}
								activeEntityId={activeEntityId}
								onSelectEntity={onSelectEntity}
								onTap={onFlipToCapital}
								renderCard={(account) => (
									<LedgerHeroCard account={account} yearMonth={selectedMonth} onTap={onFlipToCapital} />
								)}
							/>
						</Stack>
					</Stack>
				</Stack>
			</Stack>
		</>
	);
};
