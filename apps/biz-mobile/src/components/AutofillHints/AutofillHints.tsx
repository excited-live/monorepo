import React from "react";
import { Badge, HStack, Img, Text } from "@excited-live/design-system";
import { ChipButton } from "../ChipButton";

export interface AutofillSuggestion {
	id: string;
	name: string;
	imageUrl?: string;
}

export interface SuggestionChipsProps {
	suggestions: AutofillSuggestion[];
	onPick: (suggestion: AutofillSuggestion) => void;
	/** Small trailing text per chip (e.g. benchmark amount). */
	renderMeta?: (suggestion: AutofillSuggestion) => React.ReactNode;
}

/** Horizontally scrolling catalog suggestions shown under a name field. */
export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onPick, renderMeta }) => (
	<HStack gap={1.5} className="overflow-x-auto pt-1.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
		{suggestions.map((s) => {
			const meta = renderMeta?.(s);
			return (
				<ChipButton key={s.id} onClick={() => onPick(s)}>
					{s.imageUrl && <Img src={s.imageUrl} alt="" className="size-3.5 rounded-[3px] object-cover" />}
					<Text className="[font:inherit]">{s.name}</Text>
					{meta != null && <Text className="text-[10.5px] text-slate">{meta}</Text>}
				</ChipButton>
			);
		})}
	</HStack>
);

export interface AutofillBannerProps {
	badge: string;
	children: React.ReactNode;
}

/** "Auto-filled from catalog" confirmation strip. */
export const AutofillBanner: React.FC<AutofillBannerProps> = ({ badge, children }) => (
	<HStack
		gap={1.5}
		align="center"
		className="mt-1 animate-autofill-fade-in rounded-xl border border-signal/20 bg-signal/10 px-3 py-2"
	>
		<Badge variant="orange" label={badge} />
		<Text className="text-[12px] font-medium text-ink">{children}</Text>
	</HStack>
);
