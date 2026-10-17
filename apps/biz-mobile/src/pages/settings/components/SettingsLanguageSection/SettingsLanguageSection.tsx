import React from "react";
import type { MobileLocale } from "../../../../domain/types";

export interface SettingsLanguageSectionProps {
	lang?: MobileLocale;
	onSetLang?: (lang: MobileLocale) => void;
	languageTitle?: string;
}

export const SettingsLanguageSection: React.FC<SettingsLanguageSectionProps> = ({
	lang = "en",
	onSetLang = () => {},
	languageTitle = "Language / ภาษา",
}) => {
	return (
		<div className="card">
			<div className="section-header">
				<span className="section-title">{languageTitle}</span>
				<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.06)", color: "var(--granite)" }}>
					{lang.toUpperCase()}
				</span>
			</div>
			<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
				<button
					type="button"
					className={`action-pill-btn ${lang === "en" ? "primary" : ""}`}
					style={{ flex: 1 }}
					onClick={() => onSetLang("en")}
				>
					English (EN)
				</button>
				<button
					type="button"
					className={`action-pill-btn ${lang === "th" ? "primary" : ""}`}
					style={{ flex: 1 }}
					onClick={() => onSetLang("th")}
				>
					ภาษาไทย (TH)
				</button>
			</div>
		</div>
	);
};
