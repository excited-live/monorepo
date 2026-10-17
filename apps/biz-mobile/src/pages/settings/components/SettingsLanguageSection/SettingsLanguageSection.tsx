import React from "react";
import { Badge, Button, HStack } from "@excited-live/design-system";
import type { MobileLocale } from "../../../../domain/types";
import { SectionCard } from "../../../../components/SectionCard";

export interface SettingsLanguageSectionProps {
	lang?: MobileLocale;
	onSetLang?: (lang: MobileLocale) => void;
	languageTitle?: string;
}

const LANGUAGES: Array<{ code: MobileLocale; label: string }> = [
	{ code: "en", label: "English (EN)" },
	{ code: "th", label: "ภาษาไทย (TH)" },
];

export const SettingsLanguageSection: React.FC<SettingsLanguageSectionProps> = ({
	lang = "en",
	onSetLang = () => {},
	languageTitle = "Language / ภาษา",
}) => (
	<SectionCard title={languageTitle} badge={<Badge variant="neutral" label={lang.toUpperCase()} />}>
		<HStack width="100%" gap={2}>
			{LANGUAGES.map(({ code, label }) => (
				<Button
					key={code}
					label={label}
					size="lg"
					className="h-[42px]"
					variant={lang === code ? "primary" : "secondary"}
					width="100%"
					onClick={() => onSetLang(code)}
				/>
			))}
		</HStack>
	</SectionCard>
);
