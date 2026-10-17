import React from "react";
import { Card, HStack, Stack, Text } from "@excited-live/design-system";

export interface SectionHeaderProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	/** Trailing action buttons. */
	actions?: React.ReactNode;
}

/** Eyebrow title + optional subtitle on the left, action buttons on the right. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions }) => (
	<HStack width="100%" justify="between" align="center" gap={2} className="py-0.5">
		<Stack className="min-w-0">
			<Text className="text-[12px] font-bold uppercase tracking-wider text-slate">{title}</Text>
			{subtitle && <Text className="mt-0.5 text-[12px] text-slate">{subtitle}</Text>}
		</Stack>
		{actions && (
			<HStack gap={2} className="shrink-0">
				{actions}
			</HStack>
		)}
	</HStack>
);

/** Dashed-free placeholder card shown when a list is empty. */
export const EmptyCard: React.FC<{ children: React.ReactNode; isCompact?: boolean }> = ({ children, isCompact }) => (
	<Card padding={0} className={`w-full rounded-3xl border-line bg-lifted shadow-card ${isCompact ? "p-4" : "p-6"}`}>
		<Text className="text-center text-slate">{children}</Text>
	</Card>
);
