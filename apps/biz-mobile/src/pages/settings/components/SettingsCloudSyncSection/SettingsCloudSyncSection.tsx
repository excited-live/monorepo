import React from "react";
import type { MobileLocale } from "../../../../domain/types";

export interface SettingsCloudSyncSectionProps {
	cloudSyncStatus?: "synced" | "syncing" | "error";
	lastSyncedAt?: string | null;
	onSyncWithCloud?: () => void;
	lang?: MobileLocale;
}

export const SettingsCloudSyncSection: React.FC<SettingsCloudSyncSectionProps> = ({
	cloudSyncStatus = "synced",
	lastSyncedAt = null,
	onSyncWithCloud = () => {},
	lang = "en",
}) => {
	return (
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
						? `● ${lang === "th" ? "ซิงก์กับคลาวด์แล้ว" : "Synced to Cloud"}`
						: cloudSyncStatus === "syncing"
							? `● ${lang === "th" ? "กำลังซิงก์กับคลาวด์..." : "Syncing to Cloud..."}`
							: `● ${lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์" : "Cloud Sync Error"}`}
				</span>
			</div>

			<p style={{ fontSize: "13px", color: "var(--slate-gray)", marginTop: "4px" }}>
				{lang === "th"
					? "ระบบคลาวด์เนทีฟ: ข้อมูลทั้งหมดจะถูกจัดเก็บและซิงก์แบบเรียลไทม์กับ Excited Cloud (D1/SQLite) โดยตรง"
					: "Pure cloud-native architecture: all business state and balances are stored and synced in real-time with Excited Cloud."}
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
					onClick={onSyncWithCloud}
				>
					{cloudSyncStatus === "syncing"
						? (lang === "th" ? "กำลังเชื่อมต่อ..." : "Syncing...")
						: (lang === "th" ? "ซิงก์กับคลาวด์เดี๋ยวนี้" : "Sync Now")}
				</button>
			</div>
		</div>
	);
};
