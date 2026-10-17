import React from "react";
import { Badge, Stack, Text } from "@excited-live/design-system";
import { BADGE_TONE_CLASS, type Tone } from "../../utils/ui";
import { EntityThumb } from "../EntityThumb";
import { ListItemCard } from "../ListItemCard";


const TONE_CLASS: Record<Tone, string> = {
	positive: "text-[#059669]",
	negative: "text-signal",
	neutral: "text-ink",
};

export interface ItemRowProps {
	name: string;
	imageUrl?: string;
	/** Replaces the initials fallback when there is no image (emoji, currency sign...). */
	fallback?: string;
	/** Title row content; defaults to `name`. */
	title?: React.ReactNode;
	sub?: React.ReactNode;
	/** Extra content under the sub line (progress bars, notes). */
	details?: React.ReactNode;
	amount: string;
	tone?: Tone;
	badge?: string;
	badgeTone?: Tone;
	/** Small caption under the amount when there is no badge. */
	caption?: string;
	onClick?: () => void;
}

/** Standard list row: thumb, name + sub, and a right-aligned amount with a badge. */
export const ItemRow: React.FC<ItemRowProps> = ({
	name,
	imageUrl,
	fallback,
	title,
	sub,
	details,
	amount,
	tone = "neutral",
	badge,
	badgeTone = "neutral",
	caption,
	onClick,
}) => (
	<ListItemCard onClick={onClick}>
		{fallback && !imageUrl ? <EntityThumb name={fallback} /> : <EntityThumb name={name} imageUrl={imageUrl} />}
		<Stack gap={0.5} className="min-w-0 flex-1">
			{title ?? (
				<Text maxLines={1} className="text-[15px] font-semibold text-ink">
					{name}
				</Text>
			)}
			{sub && (
				<Text maxLines={1} className="text-[12px] text-slate">
					{sub}
				</Text>
			)}
			{details}
		</Stack>
		<Stack gap={1} align="end" className="shrink-0 text-right">
			<Text className={`text-[15px] font-bold ${TONE_CLASS[tone]}`}>{amount}</Text>
			{badge && <Badge variant="neutral" label={badge} className={BADGE_TONE_CLASS[badgeTone]} />}
			{caption && <Text className="text-[11px] text-slate">{caption}</Text>}
		</Stack>
	</ListItemCard>
);
