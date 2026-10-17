import React, { useState } from "react";
import { type EntityAccount, round2 } from "@excited-live/biz";
import { TuneIcon, UserIcon } from "@excited-live/design-system";
import { calculateEntityWealthMetrics } from "../domain/selectors";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";
import { t } from "../utils/i18n";
import { HeroShell } from "./HeroShell";

interface CapitalHeroCardProps {
	account: EntityAccount;
	onConfigure?: () => void;
	onPersonalSettings?: () => void;
	onTap?: () => void;
}

export const CapitalHeroCard: React.FC<CapitalHeroCardProps> = ({
	account,
	onConfigure,
	onPersonalSettings,
	onTap,
}) => {
	const { revenues, subscriptions, liabilities, hardware, transfers, selectedMonth, lang } = useBiz();
	const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

	const [showEom, setShowEom] = useState(false);

	const now = new Date();
	const currentSystemMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const isCurrentMonth = selectedMonth === "2026-10" || selectedMonth === currentSystemMonth;
	const effectiveShowEom = !isCurrentMonth || showEom;

	const metrics = calculateEntityWealthMetrics({
		account,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		yearMonth: selectedMonth,
	});

	const {
		totalAssetsValue,
		currentWealth,
		eomWealth,
		liquidPct,
		gearPct,
		totalIncome,
		totalExpense,
		liabilityMonthly,
		liabPct,
		runwayMonths,
		isDefaultAlive,
	} = metrics;

	const totalCapitalIn = round2(
		transfers.filter((t) => t.toEntityId === account.id).reduce((acc, t) => acc + t.amount, 0),
	);

	const displayedWealth = effectiveShowEom ? eomWealth : currentWealth;

	return (
		<HeroShell account={account} variant="capital" onClick={onTap}>
			<div className="hero-top-row">
				<div className="hero-eyebrow-col">
					<div className="hero-eyebrow">
						{account.type === "personal" ? t("hero.wealth", lang) : t("hero.bookValue", lang)}
					</div>
					<div className="hero-eom-hint">{t("hero.eomHint", lang)}</div>
				</div>
				<div className="hero-top-right">
					<span
						className="hero-flip-hint"
						style={{ cursor: "pointer" }}
						onClick={(e) => {
							e.stopPropagation();
							onTap?.();
						}}
					>
						{t("hero.tapToFlip", lang)}
					</span>
					{isCurrentMonth && (
						<button
							type="button"
							className={`hero-mode-toggle ${showEom ? "active" : ""}`}
							aria-label={showEom ? "Showing End of Month value" : "Showing Current value"}
							title={showEom ? "Showing End of Month (tap for Current)" : "Showing Current (tap for End of Month)"}
							onPointerDown={stop}
							onClick={(e) => {
								e.stopPropagation();
								setShowEom((prev) => !prev);
							}}
						>
							{showEom ? "EOM" : "NOW"}
						</button>
					)}
					{account.type === "business" ? (
						<button
							type="button"
							className="hero-config-btn"
							aria-label="Configure this business"
							title="Update business details"
							onPointerDown={stop}
							onPointerMove={stop}
							onPointerUp={stop}
							onClick={(e) => {
								e.stopPropagation();
								onConfigure?.();
							}}
						>
							<TuneIcon className="hero-config-icon" aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							className="hero-config-btn"
							aria-label="Personal settings"
							title="Personal settings"
							onPointerDown={stop}
							onPointerMove={stop}
							onPointerUp={stop}
							onClick={(e) => {
								e.stopPropagation();
								onPersonalSettings?.();
							}}
						>
							<UserIcon className="hero-config-icon" aria-hidden="true" />
						</button>
					)}
				</div>
			</div>

			<div className="hero-balance-row">
				<div className="hero-balance">
					฿ {formatMoney(displayedWealth)}
				</div>
				{effectiveShowEom && (
					<span className="hero-eom-tag">
						{t("hero.eomBadge", lang)}
					</span>
				)}
			</div>

			<div className="hero-badge-row">
				{isDefaultAlive ? (
					<span className="hero-status-pill alive">{t("hero.defaultAlive", lang)}</span>
				) : runwayMonths !== null ? (
					<span className="hero-status-pill runway">
						🟢 {t("hero.runwayMos", lang, { count: runwayMonths })}
					</span>
				) : null}
				{account.type === "business" && totalCapitalIn > 0 && (
					<span className="hero-status-pill capital">
						{t("hero.totalCapital", lang)}: ฿{formatMoney(totalCapitalIn)}
					</span>
				)}
			</div>

			<div className="hero-split">
				<div className="hero-split-track">
					<div className="hero-split-fill" style={{ width: `${liquidPct}%` }} />
				</div>
				<div className="hero-split-labels">
					<span>{t("hero.liquid", lang)} · {liquidPct}%</span>
					<span>{t("hero.gear", lang)} · {gearPct}%</span>
				</div>

				{liabilityMonthly > 0 && (
					<>
						<div className="hero-split-track">
							<div className="hero-split-fill liability" style={{ width: `${liabPct}%` }} />
						</div>
						<div className="hero-split-labels">
							<span>{t("hero.liability", lang)} · ฿{formatMoney(liabilityMonthly)}/mo</span>
							<span>{liabPct}% of income</span>
						</div>
					</>
				)}
			</div>

			<hr className="hero-divider" />
			<div className="hero-meta-grid">
				<div className="hero-meta-col">
					<span className="hero-meta-label">{t("hero.totalIncome", lang)}</span>
					<span className="hero-meta-value positive">+฿{formatMoney(totalIncome)}</span>
				</div>
				<div className="hero-meta-col">
					<span className="hero-meta-label">{t("hero.totalExpense", lang)}</span>
					<span className="hero-meta-value negative">-฿{formatMoney(totalExpense)}</span>
				</div>
				<div className="hero-meta-col secondary">
					<span className="hero-meta-label">{t("hero.totalAsset", lang)}</span>
					<span className="hero-meta-value">฿{formatMoney(totalAssetsValue)}</span>
				</div>
				<div className="hero-meta-col secondary">
					<span className="hero-meta-label">{t("hero.liability", lang)}</span>
					<span className="hero-meta-value negative">-฿{formatMoney(liabilityMonthly)}</span>
				</div>
			</div>
		</HeroShell>
	);
};
