import React, { useRef } from "react";

export interface SettingsDataPortabilitySectionProps {
	onExportJSON?: () => void;
	onImportJSON?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	portabilityTitle?: string;
	exportLabel?: string;
	importLabel?: string;
}

export const SettingsDataPortabilitySection: React.FC<SettingsDataPortabilitySectionProps> = ({
	onExportJSON = () => {},
	onImportJSON = () => {},
	portabilityTitle = "Data Backup & Portability",
	exportLabel = "Export Backup (JSON)",
	importLabel = "Restore Backup (JSON)",
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="card">
			<div className="section-title">{portabilityTitle}</div>
			<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
				All solopreneur entities, expenses, and depreciation tables are synchronized with your Excited Cloud account and accessible by native AI agents.
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="application/json,.json"
				onChange={onImportJSON}
				style={{ display: "none" }}
			/>

			<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
				<button
					type="button"
					className="action-pill-btn"
					onClick={onExportJSON}
				>
					{exportLabel}
				</button>

				<button
					type="button"
					className="action-pill-btn"
					onClick={() => fileInputRef.current?.click()}
				>
					{importLabel}
				</button>
			</div>
		</div>
	);
};
