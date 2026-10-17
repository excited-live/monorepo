import React, { useRef, useState } from "react";
import { useBiz } from "../state";
import { t } from "../utils/i18n";
import { SignInView } from "./SignInView";

export const SettingsView: React.FC = () => {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		transfers,
		lang,
		setLang,
		userSession,
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		signOut,
		restoreBackup,
	} = useBiz();

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isSignInOpen, setIsSignInOpen] = useState(false);

	const isCloudAccount = userSession.isAuthenticated && Boolean(userSession.email);

	const handleExportJSON = () => {
		const payload = {
			accounts,
			subscriptions,
			hardware,
			revenues,
			transfers,
			user: userSession,
			exportedAt: new Date().toISOString(),
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `excited-live-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
	};

	const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const data = JSON.parse(event.target?.result as string);
				if (data && typeof data === "object") {
					restoreBackup(data);
					alert(lang === "th" ? "กู้คืนข้อมูลสำเร็จเรียบร้อย" : "Backup restored successfully!");
				}
			} catch {
				alert(lang === "th" ? "ไฟล์ JSON ไม่ถูกต้อง" : "Invalid JSON backup file format.");
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	return (
		<div className="screen-content">
			<div className="section-header">
				<div>
					<h2 style={{ fontSize: "20px", fontWeight: 700 }}>{t("settings.title", lang)}</h2>
					<p style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						Multi-entity isolation, profile, and system synchronization.
					</p>
				</div>
			</div>

			{/* User Profile & Cloud Account */}
			<div className="card">
				<div className="section-header">
					<span className="section-title">{t("settings.profile", lang)}</span>
					<span
						className="item-badge"
						style={{
							backgroundColor: isCloudAccount
								? "rgba(5, 150, 105, 0.12)"
								: "rgba(20, 20, 19, 0.06)",
							color: isCloudAccount ? "#059669" : "var(--granite)",
						}}
					>
						{isCloudAccount ? `● ${t("settings.verified", lang)}` : `● Cloud Agent Active`}
					</span>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
						marginTop: "4px",
					}}
				>
					{userSession.avatarUrl ? (
						<img
							src={userSession.avatarUrl}
							alt={userSession.name}
							style={{
								width: "48px",
								height: "48px",
								borderRadius: "50%",
								objectFit: "cover",
								flexShrink: 0,
								border: "1px solid var(--border-subtle)",
							}}
						/>
					) : (
						<div
							style={{
								width: "48px",
								height: "48px",
								borderRadius: "50%",
								backgroundColor: "var(--ink-black)",
								color: "var(--canvas-cream)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontWeight: 700,
								fontSize: "16px",
								flexShrink: 0,
							}}
						>
							{userSession.name.slice(0, 2).toUpperCase()}
						</div>
					)}
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink-black)" }}>
							{userSession.name}
						</div>
						<div style={{ fontSize: "12px", color: "var(--slate-gray)" }}>
							{isCloudAccount
								? `${userSession.orgName} • ${userSession.email}`
								: "Connected to Excited Cloud"}
						</div>
					</div>
				</div>

				<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
					{isCloudAccount ? (
						<button
							type="button"
							className="action-pill-btn"
							style={{ flex: 1, justifyContent: "center", color: "var(--signal-orange)", borderColor: "rgba(207, 69, 0, 0.2)" }}
							onClick={signOut}
						>
							{t("settings.signOut", lang)}
						</button>
					) : (
						<button
							type="button"
							className="action-pill-btn"
							style={{ flex: 1, justifyContent: "center" }}
							onClick={() => setIsSignInOpen(true)}
						>
							{t("settings.signIn", lang)}
						</button>
					)}
				</div>
			</div>

			{/* Cloud Native State Synchronization */}
			<div className="card">
				<div className="section-header">
					<span className="section-title">
						{lang === "th" ? "การซิงก์ข้อมูลคลาวด์" : "Cloud Synchronization"}
					</span>
					<span
						className="item-badge"
						style={{
							backgroundColor:
								cloudSyncStatus === "synced"
									? "rgba(5, 150, 105, 0.12)"
									: cloudSyncStatus === "syncing"
										? "rgba(207, 69, 0, 0.12)"
										: "rgba(20, 20, 19, 0.08)",
							color:
								cloudSyncStatus === "synced"
									? "#059669"
									: cloudSyncStatus === "syncing"
										? "var(--signal-orange)"
										: "var(--granite)",
							fontWeight: 600,
						}}
					>
						{cloudSyncStatus === "synced"
							? `● ${lang === "th" ? "ซิงก์แล้ว" : "Synced to Cloud"}`
							: cloudSyncStatus === "syncing"
								? `● ${lang === "th" ? "กำลังซิงก์..." : "Syncing..."}`
								: `● ${lang === "th" ? "ออฟไลน์ (เซฟในเครื่อง)" : "Offline (Saved locally)"}`}
					</span>
				</div>

				<p style={{ fontSize: "13px", color: "var(--slate-gray)", marginTop: "4px" }}>
					{lang === "th"
						? "ระบบคลาวด์เนทีฟเชื่อมต่ออัตโนมัติกับ Excited Cloud พร้อมระบบออฟไลน์แคชในเครื่องทันที"
						: "State is persistent across devices via Excited Cloud SQLite/D1 with instant local offline capability."}
				</p>

				{lastSyncedAt && (
					<div style={{ fontSize: "11px", color: "var(--granite)", marginTop: "6px" }}>
						{lang === "th" ? "ซิงก์ล่าสุด: " : "Last synced: "}
						{new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
					</div>
				)}

				<div style={{ marginTop: "10px" }}>
					<button
						type="button"
						className="action-pill-btn primary"
						style={{ width: "100%", justifyContent: "center" }}
						disabled={cloudSyncStatus === "syncing"}
						onClick={syncWithCloud}
					>
						{cloudSyncStatus === "syncing"
							? (lang === "th" ? "กำลังเชื่อมต่อ..." : "Syncing...")
							: (lang === "th" ? "ซิงก์กับคลาวด์เดี๋ยวนี้" : "Sync Now")}
					</button>
				</div>
			</div>

			{/* Language Switcher */}
			<div className="card">
				<div className="section-header">
					<span className="section-title">{t("settings.language", lang)}</span>
					<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.06)", color: "var(--granite)" }}>
						{lang.toUpperCase()}
					</span>
				</div>
				<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
					<button
						type="button"
						className={`action-pill-btn ${lang === "en" ? "primary" : ""}`}
						style={{ flex: 1 }}
						onClick={() => setLang("en")}
					>
						English (EN)
					</button>
					<button
						type="button"
						className={`action-pill-btn ${lang === "th" ? "primary" : ""}`}
						style={{ flex: 1 }}
						onClick={() => setLang("th")}
					>
						ภาษาไทย (TH)
					</button>
				</div>
			</div>

			{/* Data Backup & Portability */}
			<div className="card">
				<div className="section-title">{t("settings.dataPortability", lang)}</div>
				<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
					All solopreneur entities, expenses, and depreciation tables are synchronized with your Excited Cloud account and accessible by native AI agents.
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="application/json,.json"
					onChange={handleImportJSON}
					style={{ display: "none" }}
				/>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
					<button
						type="button"
						className="action-pill-btn"
						onClick={handleExportJSON}
					>
						{t("settings.exportJson", lang)}
					</button>

					<button
						type="button"
						className="action-pill-btn"
						onClick={() => fileInputRef.current?.click()}
					>
						{t("settings.importJson", lang)}
					</button>
				</div>
			</div>

			{/* Sign In Sheet if requested */}
			{isSignInOpen && (
				<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
					<div className="modal-page-nav">
						<span className="modal-nav-title">{t("settings.signIn", lang)}</span>
						<button
							type="button"
							className="modal-nav-close"
							onClick={() => setIsSignInOpen(false)}
							aria-label="Close"
						>
							✕
						</button>
					</div>
					<SignInView onSignedIn={() => setIsSignInOpen(false)} />
				</div>
			)}
		</div>
	);
};
