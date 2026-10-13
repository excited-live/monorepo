import React from "react";
import type { EntityAccount } from "@excited-live/biz";
import { useImageTone } from "../hooks/useImageTone";

export type HeroVariant = "home" | "capital" | "register" | "ledger";

interface HeroShellProps {
	account?: EntityAccount;
	variant?: HeroVariant;
	children: React.ReactNode;
}

export const HeroShell: React.FC<HeroShellProps> = ({ account, variant = "home", children }) => {
	const imageTone = useImageTone(account?.imageUrl);

	return (
		<div
			className={`hero-card variant-${variant} tone-${imageTone.tone} ${account?.imageUrl ? "has-bg-image" : ""}`}
			style={
				imageTone.tintRgb
					? ({ "--hero-tint-rgb": imageTone.tintRgb } as React.CSSProperties)
					: undefined
			}
		>
			{account?.imageUrl && (
				<>
					<div
						className="hero-card-bg"
						style={{ backgroundImage: `url(${account?.imageUrl})` }}
					/>
					<div className="hero-card-scrim" />
				</>
			)}
			<div className="hero-card-content">{children}</div>
		</div>
	);
};
