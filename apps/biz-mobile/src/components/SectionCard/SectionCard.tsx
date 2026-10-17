import React from "react";
import { Card, HStack, Stack, Text } from "@excited-live/design-system";

export interface SectionCardProps {
	/** Uppercase eyebrow shown top-left. */
	title?: string;
	/** Trailing slot of the header row (usually a `Badge`). */
	badge?: React.ReactNode;
	children?: React.ReactNode;
	/** Background utility replacing the default cream surface, e.g. "bg-ink/[0.03]". */
	tint?: string;
}

/** Cream surface card with an optional eyebrow title + badge header. */
export const SectionCard: React.FC<SectionCardProps> = ({ title, badge, children, tint = "bg-lifted" }) => (
	<Card padding={0} className={`w-full min-w-0 rounded-3xl border-line ${tint} p-[18px] shadow-card`}>
		<Stack gap={4} width="100%">
			{title && (
				<HStack width="100%" justify="between" align="center" gap={2}>
					<Text weight="bold" className="text-[12px] uppercase tracking-wider text-slate">
						{title}
					</Text>
					{badge}
				</HStack>
			)}
			{children}
		</Stack>
	</Card>
);
