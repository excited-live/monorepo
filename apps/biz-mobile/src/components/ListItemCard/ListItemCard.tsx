import React from "react";
import { Card, Stack } from "@excited-live/design-system";

export interface ListItemCardProps {
	children: React.ReactNode;
	onClick?: () => void;
	/** Stack children vertically (used when a sub-card is nested under the main row). */
	isStacked?: boolean;
	className?: string;
}

/** Cream list row card: thumb → info → trailing column. Pressable when `onClick` is given. */
export const ListItemCard: React.FC<ListItemCardProps> = ({ children, onClick, isStacked = false, className = "" }) => (
	<Card
		padding={0}
		onClick={onClick}
		className={`w-full min-w-0 rounded-3xl border-line bg-white px-4 py-3 shadow-[0_2px_8px_rgba(20,20,19,0.04)] transition-[transform,border-color] duration-100 ${
			onClick ? "cursor-pointer hover:border-line-strong active:scale-[0.985]" : ""
		} ${className}`}
	>
		<Stack
			direction={isStacked ? "vertical" : "horizontal"}
			gap={isStacked ? 2 : 3}
			align={isStacked ? "stretch" : "center"}
			width="100%"
			className="min-w-0"
		>
			{children}
		</Stack>
	</Card>
);
