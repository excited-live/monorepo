import React from "react";
import { Stack } from "@astryxdesign/core/Stack";
import "../hero.css";
import type { EntityAccount } from "@excited-live/accounting";

export type HeroVariant = "home" | "capital" | "register" | "ledger";

export interface HeroShellProps {
	account?: EntityAccount;
	variant?: HeroVariant;
	onClick?: (e: React.MouseEvent) => void;
	children: React.ReactNode;
}

export const HeroShell: React.FC<HeroShellProps> = ({ variant = "home", onClick, children }) => {
	return (
		<Stack
			className={`hero-card variant-${variant} tone-light`}
			onClick={onClick}
			style={{ cursor: onClick ? "pointer" : undefined }}
		>
			<Stack className="hero-card-content">{children}</Stack>
		</Stack>
	);
};
