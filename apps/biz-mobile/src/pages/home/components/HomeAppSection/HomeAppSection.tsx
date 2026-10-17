import React from "react";
import { Stack, Text } from "@excited-live/design-system";

export interface HomeAppSectionProps {
	children?: React.ReactNode;
}

/** Cream sheet that rises over the hero illustration and extends under the bottom dock. */
export const HomeAppSection: React.FC<HomeAppSectionProps> = ({
	children = <Text className="py-5 text-center text-slate">Sheet Content</Text>,
}) => (
	<Stack
		gap={5}
		className="relative z-10 -mt-9 -mb-[var(--dock-clearance)] -mx-4 min-h-[calc(100vh-280px)] w-[calc(100%+32px)] flex-1 rounded-t-[32px] border-t border-line bg-lifted px-4 pt-4 pb-[calc(40px+var(--dock-clearance))] shadow-[0_-12px_32px_-4px_rgba(20,20,19,0.08)]"
	>
		<Stack className="mx-auto mb-1 h-1 w-9 shrink-0 rounded-pill bg-ink/15" />
		{children}
	</Stack>
);
