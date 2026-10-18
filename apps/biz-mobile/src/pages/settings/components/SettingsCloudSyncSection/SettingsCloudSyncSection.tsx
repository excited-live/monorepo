import React from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import type { MobileLocale } from "../../../../domain/types";
import { BADGE_TONE_CLASS } from "../../../../utils/ui";
import { SectionCard } from "../../../../components/SectionCard";

export interface SettingsCloudSyncSectionProps {
	cloudSyncStatus?: "synced" | "syncing" | "error";
	lastSyncedAt?: string | null;
	onSyncWithCloud?: () => void;
	lang?: MobileLocale;
}

const STATUS_BADGE = {
	synced: { tone: "positive", en: "Synced to Cloud", th: "ซิงก์กับคลาวด์แล้ว" },
	syncing: { tone: "negative", en: "Syncing to Cloud...", th: "กำลังซิงก์กับคลาวด์..." },
	error: { tone: "neutral", en: "Cloud Sync Error", th: "เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์" },
} as const;

export const SettingsCloudSyncSection: React.FC<SettingsCloudSyncSectionProps> = ({
	cloudSyncStatus = "synced",
	lastSyncedAt = null,
	onSyncWithCloud = () => {},
	lang = "en",
}) => {
	const th = lang === "th";
	const status = STATUS_BADGE[cloudSyncStatus];
	const isSyncing = cloudSyncStatus === "syncing";

	return (
		<SectionCard
			title={th ? "การซิงก์ข้อมูลคลาวด์" : "Cloud Synchronization"}
			badge={<Badge variant="neutral" className={BADGE_TONE_CLASS[status.tone]} label={`● ${th ? status.th : status.en}`} />}
		>
			<Text className="text-[13px] text-slate">
				{th
					? "ระบบคลาวด์เนทีฟ: ข้อมูลทั้งหมดจะถูกจัดเก็บและซิงก์แบบเรียลไทม์กับ Excited Cloud (D1/SQLite) โดยตรง"
					: "Pure cloud-native architecture: all business state and balances are stored and synced in real-time with Excited Cloud."}
			</Text>

			{lastSyncedAt && (
				<Text className="text-[11px] text-granite">
					{th ? "ซิงก์ล่าสุด: " : "Last synced: "}
					{new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
				</Text>
			)}

			<Button
				label={isSyncing ? (th ? "กำลังเชื่อมต่อ..." : "Syncing...") : th ? "ซิงก์กับคลาวด์เดี๋ยวนี้" : "Sync Now"}
				size="lg"
				className="h-[42px]"
				variant="primary"
				width="100%"
				isDisabled={isSyncing}
				onClick={onSyncWithCloud}
			/>
		</SectionCard>
	);
};
