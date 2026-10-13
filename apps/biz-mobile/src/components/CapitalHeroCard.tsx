import React from "react";
import {
	calculateAssetDepreciation,
	calculateDerivedTreasury,
	calculateMonthlyEquivalent,
	type EntityAccount,
	isCashAsset,
	round2,
} from "@excited-live/biz";
import { TuneIcon, UserIcon } from "@excited-live/design-system";
import { HeroShell } from "./HeroShell";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

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

	// The derived treasury already contains the entity's cash assets, so the
	// liquid figure is just the treasury; only depreciating gear is added on top.
	const entityAssets = hardware.filter((h) => h.entityId === account.id);
	const cashAssetsValue = round2(
		entityAssets.filter((h) => isCashAsset(h)).reduce((acc, h) => acc + h.cost, 0),
	);
	const gearAssets = entityAssets.filter((h) => !isCashAsset(h));
	const bookValue = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").remainingBookValue,
			0,
		),
	);
	const totalAssetsValue = round2(bookValue + cashAssetsValue);
	// cashReserve is cash on hand today; the month's income/expenses on top of
	// it give the end-of-month position (shown alongside so mid-month checks
	// don't look like a mismatch).
	const currentLiquid = account.cashReserve;
	const eomLiquid = calculateDerivedTreasury({
		account,
		subscriptions,
		revenues,
		liabilities,
		hardware,
		transfers,
	});
	const currentWealth = round2(currentLiquid + bookValue);
	const eomWealth = round2(eomLiquid + bookValue);
	const liquidPct = currentWealth > 0 ? Math.round((currentLiquid / currentWealth) * 100) : 0;
	const gearPct = 100 - liquidPct;

	const entityRevenues = revenues.filter((r) => r.entityId === account.id && r.active);
	const hasSalaryStream = entityRevenues.some((r) => r.source === "salary");
	const legacySalary = !hasSalaryStream && account.type === "personal" ? (account.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
		entityRevenues
			.filter((r) => r.frequency === "monthly")
			.reduce((acc, r) => acc + r.amount, 0),
	);

	const totalExpense = round2(
		subscriptions
			.filter((s) => s.entityId === account.id && s.active)
			.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
	);

	const liabilityMonthly = round2(
		liabilities
			.filter((l) => l.entityId === account.id && l.active)
			.reduce((acc, l) => acc + l.amount, 0),
	);


	const liabPct =
		totalIncome > 0
			? Math.min(100, Math.round((liabilityMonthly / totalIncome) * 100))
			: liabilityMonthly > 0
				? 100
				: 0;

	return (
		<HeroShell account={account} variant="capital" onClick={onTap}>
			<div className="hero-top-row">
				<div className="hero-eyebrow">{account.type === "personal" ? "Wealth" : "Book Value"}</div>
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
