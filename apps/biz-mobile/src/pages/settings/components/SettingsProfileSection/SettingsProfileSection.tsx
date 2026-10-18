import React from "react";
import { Img } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { UserSession } from "../../../../domain/types";
import { FIXTURE_USER_SESSION } from "../../../../testing/fixtures";
import { BADGE_TONE_CLASS } from "../../../../utils/ui";
import { SectionCard } from "../../../../components/SectionCard";

export interface SettingsProfileSectionProps {
	userSession?: UserSession;
	isCloudAccount?: boolean;
	onSignOut?: () => void;
	onSignIn?: () => void;
	verifiedLabel?: string;
	signOutLabel?: string;
	signInLabel?: string;
	profileTitle?: string;
}

export const SettingsProfileSection: React.FC<SettingsProfileSectionProps> = ({
	userSession = FIXTURE_USER_SESSION,
	isCloudAccount = Boolean(userSession.isAuthenticated && userSession.email),
	onSignOut = () => {},
	onSignIn = () => {},
	verifiedLabel = "Verified",
	signOutLabel = "Sign Out",
	signInLabel = "Sign In",
	profileTitle = "User Profile & Cloud Account",
}) => (
	<SectionCard
		title={profileTitle}
		badge={
			<Badge
				variant="neutral"
				className={BADGE_TONE_CLASS[isCloudAccount ? "positive" : "neutral"]}
				label={isCloudAccount ? `● ${verifiedLabel}` : "● Cloud Agent Active"}
			/>
		}
	>
		<HStack width="100%" gap={3} align="center">
			{userSession.avatarUrl ? (
				<Img
					src={userSession.avatarUrl}
					alt={userSession.name}
					className="size-12 shrink-0 rounded-full border border-line object-cover"
				/>
			) : (
				<HStack
					justify="center"
					align="center"
					className="size-12 shrink-0 rounded-full bg-ink text-base font-bold text-cream"
				>
					{userSession.name.slice(0, 2).toUpperCase()}
				</HStack>
			)}
			<Stack className="min-w-0 flex-1">
				<Text weight="bold" className="text-[15px] text-ink">
					{userSession.name}
				</Text>
				<Text className="text-[12px] text-slate">
					{isCloudAccount ? `${userSession.orgName} • ${userSession.email}` : "Connected to Excited Cloud"}
				</Text>
			</Stack>
		</HStack>

		{isCloudAccount ? (
			<Button
				label={signOutLabel}
				size="lg"
				className="h-[42px] font-semibold text-signal"
				variant="secondary"
				width="100%"
				onClick={onSignOut}
			/>
		) : (
			<Button label={signInLabel} size="lg" className="h-[42px]" variant="secondary" width="100%" onClick={onSignIn} />
		)}
	</SectionCard>
);
