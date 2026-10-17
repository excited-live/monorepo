import React from "react";
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
		<div className="screen-content">
			<div className="section-header">
				<div>
					<h2 style={{ fontSize: "20px", fontWeight: 700 }}>{t("settings.title")}</h2>
					<p style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						Multi-entity isolation, profile, and system synchronization.
					</p>
				</div>
			</div>

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
			<SettingsLanguageSection
				lang={lang}
				onSetLang={setLang}
				languageTitle={t("settings.language")}
			/>

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
				<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
					<div className="modal-page-nav">
						<span className="modal-nav-title">{t("settings.signIn")}</span>
						<button
							type="button"
							className="modal-nav-close"
							onClick={() => setIsSignInOpen(false)}
							aria-label="Close"
						>
							✕
						</button>
					</div>
					<Signin onSignedIn={() => setIsSignInOpen(false)} />
				</div>
			)}
		</div>
	);
};

export const SettingsView = Settings;
