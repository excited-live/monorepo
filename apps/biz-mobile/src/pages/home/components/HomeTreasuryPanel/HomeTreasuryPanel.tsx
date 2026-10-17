import React from "react";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface HomeTreasuryPanelProps {
	totalTreasury: number;
	totalEomTreasury: number;
	personalCash: number;
	businessCash: number;
	lang: MobileLocale;
}

export const HomeTreasuryPanel: React.FC<HomeTreasuryPanelProps> = ({
	totalTreasury,
	totalEomTreasury,
	personalCash,
	businessCash,
	lang,
}) => {
	return (
		<div className="home-treasury-panel">
			<div className="home-hero-eyebrow">
				<span className="hero-eyebrow-dot">•</span>
				<span>{t("home.consolidated", lang)}</span>
			</div>
			<div className="home-hero-balance">
				<span className="home-hero-currency">฿</span>
				<span>{formatMoney(totalTreasury)}</span>
				<span className="home-hero-eom">
					(end of month ฿{formatMoney(totalEomTreasury)})
				</span>
			</div>
			<div className="home-hero-meta-row">
				<div className="home-hero-chip">
					<span className="chip-label">{t("home.personal", lang)}:</span>
					<span className="chip-value">฿{formatMoney(personalCash)}</span>
				</div>
				<div className="home-hero-chip">
					<span className="chip-label">{t("home.businesses", lang)}:</span>
					<span className="chip-value">฿{formatMoney(businessCash)}</span>
				</div>
			</div>
		</div>
	);
};
