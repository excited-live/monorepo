import { useRef, useState } from "react";
import { useUserData, useCloudSync, useFinances, useAppUI } from "../../../state";
import { t } from "../../../utils/i18n";

export function useSettings() {
	const {
		userSession,
		isCloudAccount,
		signOut,
	} = useUserData();

	const {
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		restoreBackup,
	} = useCloudSync();

	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		transfers,
	} = useFinances();

	const {
		lang,
		setLang,
	} = useAppUI();

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isSignInOpen, setIsSignInOpen] = useState(false);

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

	return {
		userSession,
		isCloudAccount,
		signOut,
		cloudSyncStatus,
		lastSyncedAt,
		syncWithCloud,
		lang,
		setLang,
		fileInputRef,
		isSignInOpen,
		setIsSignInOpen,
		handleExportJSON,
		handleImportJSON,
		t: (key: Parameters<typeof t>[0]) => t(key, lang),
	};
}
