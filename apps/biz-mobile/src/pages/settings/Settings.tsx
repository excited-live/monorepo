import React from "react";
import { Heading, Stack, Text } from "@excited-live/design-system";
import { ModalPage } from "../../components";
import { Signin } from "../signin/Signin";
import {
	SettingsCloudSyncSection,
	SettingsDataPortabilitySection,
	SettingsLanguageSection,
	SettingsProfileSection,
} from "./components";
import { useSettings } from "./hooks";

export const Settings: React.FC = () => {
	const {
		userSession,
		isCloudAccount,
		signOut,
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		lang,
		setLang,
		isSignInOpen,
		setIsSignInOpen,
		handleExportJSON,
		handleImportJSON,
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

			{/* Cloud Native State Synchronization */}
			<SettingsCloudSyncSection
				cloudSyncStatus={cloudSyncStatus}
				lastSyncedAt={lastSyncedAt}
				onSyncWithCloud={syncWithCloud}
				lang={lang}
			/>

			{/* Language Switcher */}
			<SettingsLanguageSection lang={lang} onSetLang={setLang} languageTitle={t("settings.language")} />

			{/* Data Backup & Portability */}
			<SettingsDataPortabilitySection
				onExportJSON={handleExportJSON}
				onImportJSON={handleImportJSON}
				portabilityTitle={t("settings.dataPortability")}
				exportLabel={t("settings.exportJson")}
				importLabel={t("settings.importJson")}
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
