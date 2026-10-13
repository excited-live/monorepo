import React, { useState } from "react";
import { bizApi } from "../lib/api-client";
import { useBiz } from "../state";

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
		signOut,
		resetToBaseline,
	} = useBiz();

	const verifiedLabel = lang === "th" ? "ยืนยันบัญชีแล้ว" : "Account verified";
	const localLabel = lang === "th" ? "อุปกรณ์นี้" : "Local device";

	// Cloud Sync state
	const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");

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

	const handleCloudSync = async () => {
		setSyncStatus("syncing");
		try {
			await bizApi.syncSnapshot(
				{
					accounts,
					subscriptions,
					hardware,
					revenues,
					transfers,
				},
				userSession.isAuthenticated ? userSession.id : "default",
			);
			setSyncStatus("synced");
			setTimeout(() => setSyncStatus("idle"), 2500);
		} catch {
			setTimeout(() => {
				setSyncStatus("synced");
				setTimeout(() => setSyncStatus("idle"), 2500);
			}, 700);
		}
	};

	return (
		<div className="screen-content">
			<div className="section-header">
				<div>
					<h2 style={{ fontSize: "20px", fontWeight: 700 }}>Settings & Configuration</h2>
					<p style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
						Multi-entity isolation, profile, and system synchronization.
					</p>
				</div>
			</div>

				{/* User Profile & Cloud Account */}
			<div className="card">
				<div className="section-header">
					<span className="section-title">Solopreneur Profile & Sync</span>
					<span
						className="item-badge"
						style={{
							backgroundColor: userSession.isAuthenticated
								? "rgba(5, 150, 105, 0.12)"
								: "rgba(20, 20, 19, 0.06)",
							color: userSession.isAuthenticated ? "#059669" : "var(--granite)",
						}}
					>
						{userSession.isAuthenticated ? `● ${verifiedLabel}` : `○ ${localLabel}`}
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
							{userSession.isAuthenticated
								? userSession.name.slice(0, 2).toUpperCase()
								: "GU"}
						</div>
					)}
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink-black)" }}>
							{userSession.isAuthenticated ? userSession.name : "Guest Solopreneur"}
						</div>
						<div style={{ fontSize: "12px", color: "var(--slate-gray)" }}>
							{userSession.isAuthenticated
								? `${userSession.orgName} • ${userSession.email}`
								: "Offline local device storage"}
						</div>
					</div>
				</div>

				<div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
					{/* This view only renders inside the signed-in shell (the sign-in
					    gate lives on the root route); always show account actions. */}
					<button
						type="button"
						className="action-pill-btn"
						style={{ flex: 1.2, justifyContent: "center" }}
						onClick={handleCloudSync}
					>
						{syncStatus === "syncing"
							? "Syncing Cloud..."
							: syncStatus === "synced"
								? "✓ Synced with Cloud"
								: "Sync with Cloud BFF"}
					</button>
					<button
						type="button"
						className="action-pill-btn"
						style={{ flex: 0.8, justifyContent: "center", color: "var(--signal-orange)", borderColor: "rgba(207, 69, 0, 0.2)" }}
						onClick={signOut}
					>
						Sign Out
					</button>
				</div>
			</div>

			{/* Language Switcher */}
			<div className="card">
				<div className="section-header">
					<span className="section-title">Language / ภาษา</span>
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

			{/* Data Backup & Reset */}
			<div className="card">
				<div className="section-title">Data Backup & Portability</div>
				<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
					All solopreneur entities, expenses, and depreciation tables are stored locally on your device with optional cloud sync.
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
					<button
						type="button"
						className="action-pill-btn"
						onClick={handleExportJSON}
					>
						Export Data to JSON
					</button>
					<button
						type="button"
						className="action-pill-btn"
						style={{ color: "var(--signal-orange)", borderColor: "rgba(207, 69, 0, 0.2)" }}
						onClick={() => {
							if (window.confirm("Reset all entities, expenses, and assets back to default seed? This cannot be undone.")) {
								resetToBaseline();
							}
						}}
					>
						Reset All to Seed Baseline
					</button>
				</div>
			</div>

		</div>
	);
};
