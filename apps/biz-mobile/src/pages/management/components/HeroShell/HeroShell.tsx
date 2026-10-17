import React from "react";
import type { EntityAccount } from "@excited-live/biz";

export type HeroVariant = "home" | "capital" | "register" | "ledger";

export interface HeroShellProps {
	account?: EntityAccount;
	variant?: HeroVariant;
	onClick?: (e: React.MouseEvent) => void;
	children: React.ReactNode;
}

export const HeroShell: React.FC<HeroShellProps> = ({ variant = "home", onClick, children }) => {
	return (
		<div
			className={`hero-card variant-${variant} tone-light`}
			onClick={onClick}
			style={{ cursor: onClick ? "pointer" : undefined }}
		>
			<div className="hero-card-content">{children}</div>
		</div>
	);
};
