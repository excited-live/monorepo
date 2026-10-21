import React from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ModalPage } from "../../components";
import { Signin } from "../signin/Signin";
import {
	SettingsConnectedAgentsSection,
	SettingsLanguageSection,
	SettingsProfileSection,
} from "./components";
import { useSettings } from "./hooks";

export const Settings: React.FC = () => {
	const {
		userSession,
		isCloudAccount,
		signOut,
		lang,
		setLang,
		isSignInOpen,
		setIsSignInOpen,
		agentKeys,
		agentKeysLoading,
		agentKeysError,
		revokeAgentKey,
		t,
	} = useSettings();

	return (
		<Stack gap={4} width="100%" className="min-w-0 pt-2">
			<Stack gap={0.5}>
				<Heading level={2} className="text-xl font-bold">
					{t("settings.title")}
				</Heading>
				<Text className="text-[12px] text-slate">Multi-entity isolation, profile, and system synchronization.</Text>
			</Stack>

			{/* User Profile & Cloud Account */}
			<SettingsProfileSection
				userSession={userSession}
				isCloudAccount={isCloudAccount}
				onSignOut={signOut}
				onSignIn={() => setIsSignInOpen(true)}
				profileTitle={t("settings.profile")}
				verifiedLabel={t("settings.verified")}
				signOutLabel={t("settings.signOut")}
				signInLabel={t("settings.signIn")}
			/>

			{/* Language Switcher */}
			<SettingsLanguageSection lang={lang} onSetLang={setLang} languageTitle={t("settings.language")} />

			{/* API keys agents use to write to the books */}
			<SettingsConnectedAgentsSection
				keys={agentKeys}
				isLoading={agentKeysLoading}
				isError={agentKeysError}
				onRevoke={revokeAgentKey}
			/>

			{/* Sign In Sheet if requested */}
			{isSignInOpen && (
				<ModalPage title={t("settings.signIn")} onClose={() => setIsSignInOpen(false)}>
					<Signin onSignedIn={() => setIsSignInOpen(false)} />
				</ModalPage>
			)}
		</Stack>
	);
};

export const SettingsView = Settings;
