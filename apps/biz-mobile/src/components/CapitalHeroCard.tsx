import React from "react";
import type { EntityAccount } from "@excited-live/biz";
import { TuneIcon, UserIcon } from "@excited-live/design-system";
import { calculateEntityWealthMetrics } from "../domain/selectors";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";
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
	const { revenues, subscriptions, liabilities, hardware, transfers } = useBiz();
	const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

	const metrics = calculateEntityWealthMetrics({
		account,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		yearMonth: "2026-10",
	});

	const {
		totalAssetsValue,
		currentLiquid,
		eomLiquid,
		currentWealth,
		eomWealth,
		liquidPct,
		gearPct,
		totalIncome,
		totalExpense,
		liabilityMonthly,
		liabPct,
	} = metrics;

	return (
		<HeroShell account={account} variant="capital" onClick={onTap}>
			<div className="hero-top-row">
				<div className="hero-eyebrow-col">
					<div className="hero-eyebrow">
						{account.type === "personal" ? "Wealth" : "Book Value"}
					</div>
					<div className="hero-eom-hint">( ) = end of month value</div>
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
						Tap to flip
					</span>
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

			<div className="hero-balance">
				฿ {formatMoney(currentWealth)}
				<span className="hero-balance-eom">(฿{formatMoney(eomWealth)})</span>
				<span className="hero-balance-sub">
					Liquid ฿ {formatMoney(currentLiquid)} (฿{formatMoney(eomLiquid)})
				</span>
			</div>

			<div className="hero-split">
				<div className="hero-split-track">
					<div className="hero-split-fill" style={{ width: `${liquidPct}%` }} />
				</div>
				<div className="hero-split-labels">
					<span>Liquid · {liquidPct}%</span>
					<span>Gear · {gearPct}%</span>
				</div>

				{liabilityMonthly > 0 && (
					<>
						<div className="hero-split-track">
							<div className="hero-split-fill liability" style={{ width: `${liabPct}%` }} />
						</div>
						<div className="hero-split-labels">
							<span>Liability · ฿{formatMoney(liabilityMonthly)}/mo</span>
							<span>{liabPct}% of income</span>
						</div>
					</>
				)}
			</div>

			<hr className="hero-divider" />
			<div className="hero-meta-row">
				<span className="hero-meta-label">Total Income</span>
				<span className="hero-meta-value positive">+฿ {formatMoney(totalIncome)}</span>
			</div>
			<div className="hero-meta-row">
				<span className="hero-meta-label">Total Expense</span>
				<span className="hero-meta-value">-฿ {formatMoney(totalExpense)}</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Total Asset</span>
				<span className="hero-meta-value">฿ {formatMoney(totalAssetsValue)}</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Liability</span>
				<span className="hero-meta-value">-฿ {formatMoney(liabilityMonthly)}</span>
			</div>
		</HeroShell>
	);
};
