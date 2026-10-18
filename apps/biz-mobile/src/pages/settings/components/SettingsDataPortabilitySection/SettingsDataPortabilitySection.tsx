import React, { useRef } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";

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
		<SectionCard title={portabilityTitle}>
			<Text className="text-[13px] text-slate">
				All solopreneur entities, expenses, and depreciation tables are synchronized with your Excited Cloud account and
				accessible by native AI agents.
			</Text>

			<input
				ref={fileInputRef}
				type="file"
				accept="application/json,.json"
				onChange={onImportJSON}
				className="hidden"
			/>

			<Stack gap={2} width="100%">
				<Button
					label={exportLabel}
					size="lg"
					className="h-[42px]"
					variant="secondary"
					width="100%"
					onClick={onExportJSON}
				/>
				<Button
					label={importLabel}
					size="lg"
					className="h-[42px]"
					variant="secondary"
					width="100%"
					onClick={() => fileInputRef.current?.click()}
				/>
			</Stack>
		</SectionCard>
	);
};
