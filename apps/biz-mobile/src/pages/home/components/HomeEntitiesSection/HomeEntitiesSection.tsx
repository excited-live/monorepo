import React from "react";
import type { EntityAccount } from "@excited-live/biz";
import { calculatePaydayCountdown as defaultCalculatePaydayCountdown } from "../../../../domain/selectors";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface HomeEntitiesSectionProps {
	accounts: EntityAccount[];
	lang?: MobileLocale;
	onAddBusiness?: () => void;
	onSelectAccount?: (accId: string) => void;
	onOpenCareerEdit?: (acc: EntityAccount) => void;
	eomTreasury?: (acc: EntityAccount) => number;
	formatType?: (type: string) => string;
	calculatePaydayCountdown?: (day?: number) => string | null;
}

export const HomeEntitiesSection: React.FC<HomeEntitiesSectionProps> = ({
	accounts,
	lang = "en",
	onAddBusiness = () => {},
	onSelectAccount = () => {},
	onOpenCareerEdit = () => {},
	eomTreasury = (acc) => acc.cashReserve,
	formatType = (entityType) =>
		entityType === "personal" ? t("home.personal", lang) : t("home.businesses", lang),
	calculatePaydayCountdown = defaultCalculatePaydayCountdown,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<div className="section-header">
				<span className="section-title">{t("section.entities", lang)}</span>
				<button
					type="button"
					className="action-pill-btn primary"
					style={{ padding: "4px 12px", fontSize: "12px" }}
					onClick={onAddBusiness}
				>
					{t("action.addBusiness", lang)}
				</button>
			</div>

			<div className="item-list">
				{accounts.map((acc) => {
					const hasCareer =
						acc.type === "personal" && Boolean(acc.careerTitle || acc.careerCompany || acc.salary);
					const countdown = calculatePaydayCountdown(acc.paydayDayOfMonth);
					return (
						<div
							key={acc.id}
							className={`list-item-card ${hasCareer ? "has-subcard" : ""}`}
						>
							<div
								className="entity-card-main"
								role="button"
								tabIndex={0}
								style={{ cursor: "pointer" }}
								onClick={() => onSelectAccount(acc.id)}
							>
								<div className="item-thumb-wrapper">
									{acc.imageUrl ? (
										<img src={acc.imageUrl} alt={acc.name} className="item-thumb" />
									) : (
										<div className="item-thumb-fallback">
											{acc.name.slice(0, 2).toUpperCase()}
										</div>
									)}
								</div>
								<div className="item-info">
									<span className="item-name">{acc.name}</span>
									<span className="item-sub">
										Treasury: ฿{formatMoney(acc.cashReserve)} (฿{formatMoney(eomTreasury(acc))})
									</span>
								</div>
								<div className="item-amount-col">
									<span
										className="item-badge"
										style={{
											backgroundColor: "rgba(20, 20, 19, 0.06)",
											color: "var(--granite)",
										}}
									>
										{formatType(acc.type)}
									</span>
								</div>
							</div>

							{/* Career sub-card decoupled from entity card click */}
							{hasCareer && (
								<button
									type="button"
									className="career-subcard"
									onClick={(e) => {
										e.stopPropagation();
										onOpenCareerEdit(acc);
									}}
								>
									{acc.careerImageUrl ? (
										<img
											src={acc.careerImageUrl}
											alt={acc.careerTitle || acc.name}
											className="career-subcard-image"
										/>
									) : (
										<div className="career-subcard-image career-subcard-image-fallback">
											{(acc.careerTitle || acc.name).slice(0, 2).toUpperCase()}
										</div>
									)}
									<div className="career-subcard-info">
										<div className="career-subcard-head">
											<span className="career-subcard-eyebrow">{t("home.currentCareer", lang)}</span>
											{countdown && (
												<span className="career-subcard-payday">{countdown}</span>
											)}
										</div>
										<span className="career-subcard-title">
											{acc.careerTitle || acc.name}
										</span>
										{acc.careerCompany && (
											<span className="career-subcard-company">{acc.careerCompany}</span>
										)}
										{acc.salary ? (
											<span className="career-subcard-income">
												+฿{formatMoney(acc.salary)}/mo
											</span>
										) : null}
									</div>
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
