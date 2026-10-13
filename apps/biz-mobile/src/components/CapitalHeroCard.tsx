import React from "react";
import {
	calculateAssetDepreciation,
	type EntityAccount,
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
}

export const CapitalHeroCard: React.FC<CapitalHeroCardProps> = ({
	account,
	onConfigure,
	onPersonalSettings,
}) => {
	const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();
	const { transfers, hardware } = useBiz();

	const incomingTotal = round2(
		transfers
			.filter((t) => t.toEntityId === account.id)
			.reduce((acc, t) => acc + t.amount, 0),
	);

	const outgoingTotal = round2(
		transfers
			.filter((t) => t.fromEntityId === account.id)
			.reduce((acc, t) => acc + t.amount, 0),
	);

	const bookValue = round2(
		hardware
			.filter((h) => h.entityId === account.id)
			.reduce(
				(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").remainingBookValue,
				0,
			),
	);

	const totalCapital = account.cashReserve + bookValue;
	const liquidPct = totalCapital > 0 ? Math.round((account.cashReserve / totalCapital) * 100) : 0;

	return (
		<HeroShell account={account} variant="capital">
			<div className="hero-top-row">
				<div className="hero-eyebrow">Cash & Liquidity</div>
				<span className="hero-flip-hint">Tap to flip</span>
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
			<div className="hero-balance">
				฿ {formatMoney(account.cashReserve)}
			</div>
			<div className="hero-badge-row">
				<div className="hero-status-pill alive">Liquid</div>
			</div>

			<div className="hero-split">
				<div className="hero-split-track">
					<div className="hero-split-fill" style={{ width: `${liquidPct}%` }} />
				</div>
				<div className="hero-split-labels">
					<span>Liquid · {liquidPct}%</span>
					<span>In Gear · ฿{formatMoney(bookValue)}</span>
				</div>
			</div>

			<hr className="hero-divider" />
			<div className="hero-meta-row">
				<span className="hero-meta-label">Injected Capital</span>
				<span className="hero-meta-value positive">
					+฿ {formatMoney(incomingTotal)}
				</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Deployed Out</span>
				<span className="hero-meta-value">-฿ {formatMoney(outgoingTotal)}</span>
			</div>
			<div className="hero-meta-row secondary">
				<span className="hero-meta-label">Hardware Book Value</span>
				<span className="hero-meta-value">฿ {formatMoney(bookValue)}</span>
			</div>
		</HeroShell>
	);
};
