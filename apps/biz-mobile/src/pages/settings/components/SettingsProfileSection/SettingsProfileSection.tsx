import React from "react";
import type { UserSession } from "../../../../domain/types";
import { FIXTURE_USER_SESSION } from "../../../../testing/fixtures";

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
}) => {
	return (
		<div className="card">
			<div className="section-header">
				<span className="section-title">{profileTitle}</span>
				<span
					className="item-badge"
					style={{
						backgroundColor: isCloudAccount
							? "rgba(5, 150, 105, 0.12)"
							: "rgba(20, 20, 19, 0.06)",
						color: isCloudAccount ? "#059669" : "var(--granite)",
					}}
				>
					{isCloudAccount ? `● ${verifiedLabel}` : `● Cloud Agent Active`}
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
						onClick={onSignOut}
					>
						{signOutLabel}
					</button>
				) : (
					<button
						type="button"
						className="action-pill-btn"
						style={{ flex: 1, justifyContent: "center" }}
						onClick={onSignIn}
					>
						{signInLabel}
					</button>
				)}
			</div>
		</div>
	);
};
