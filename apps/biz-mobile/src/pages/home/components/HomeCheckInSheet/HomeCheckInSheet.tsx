import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlainButton } from "@excited-live/design-system";
import type { MobileLocale } from "../../../../domain/types";
import type { CheckInAnswer } from "../../../../domain/weekLoop";
import { t } from "../../../../i18n";
import { formatMoney } from "../../../../utils/format";

/**
 * HomeCheckInSheet — S4 of the week-one loop (#102).
 *
 * The one recurring ask, and it must cost almost nothing: a prefilled guess so
 * "about the same" is one tap, three chips, and an optional exact amount. It
 * writes through the existing expense path — no new data model.
 *
 * Skipping is first-class and worded without guilt. No confetti, no streak
 * counter, no "don't break your streak".
 */

export interface HomeCheckInSheetProps {
	/** What we think they spent today; hedged and editable in place. */
	guessAmount: number;
	/** The thing the guess is about ("food and travel"). */
	guessLabel: string;
	selected?: CheckInAnswer;
	/** 1 = confirm the guess, 2 = the saved receipt. */
	step?: 1 | 2;
	saving?: boolean;
	onSelect?: (answer: CheckInAnswer) => void;
	onConfirm?: () => void;
	onEdit?: () => void;
	onSkip?: () => void;
	onUndo?: () => void;
	lang: MobileLocale;
}

/** Chip order and multipliers follow the ported design; labels come from the dictionary. */
const CHIPS: { id: CheckInAnswer; key: string; multiplier: number }[] = [
	{ id: "same", key: "checkIn.chip.same", multiplier: 1 },
	{ id: "less", key: "checkIn.chip.less", multiplier: 0.6 },
	{ id: "more", key: "checkIn.chip.more", multiplier: 1.5 },
];

export const HomeCheckInSheet: React.FC<HomeCheckInSheetProps> = ({
	guessAmount,
	guessLabel,
	selected = "same",
	step = 1,
	saving = false,
	onSelect,
	onConfirm,
	onEdit,
	onSkip,
	onUndo,
	lang,
}) => {
	if (step === 2) {
		return (
			<Stack
				as="section"
				role="status"
				aria-live="polite"
				aria-label={t("checkIn.a11y.saved", lang)}
				gap={3}
				className="w-full min-w-0 rounded-element border border-line bg-lifted p-5 shadow-card"
			>
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t("checkIn.saved", lang)}
				</Text>
				<Text className="text-[17px] leading-[1.4] text-ink">{t("checkIn.savedBody", lang)}</Text>
				{onUndo && (
					<PlainButton
						onClick={onUndo}
						className="cursor-pointer self-start text-[14.5px] font-medium text-ink underline underline-offset-[3px]"
					>
						{t("checkIn.undo", lang)}
					</PlainButton>
				)}
			</Stack>
		);
	}

	const multiplier = CHIPS.find((chip) => chip.id === selected)?.multiplier ?? 1;
	const projected = Math.round(guessAmount * multiplier);

	return (
		<Stack
			as="section"
			aria-label={t("checkIn.a11y.label", lang)}
			gap={3}
			className="w-full min-w-0 rounded-element border border-line bg-lifted p-5 shadow-card"
		>
			<HStack width="100%" justify="between" align="end" gap={3}>
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t("checkIn.meta", lang)}
				</Text>
				<Text className="text-[12.5px] text-slate">{t("checkIn.step", lang)}</Text>
			</HStack>

			<Text className="text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
				{t("checkIn.title", lang, { amount: formatMoney(projected), label: guessLabel })}
			</Text>

			<HStack gap={2} align="stretch">
				{CHIPS.map((chip) => {
					const isSelected = selected === chip.id;
					return (
						<PlainButton
							key={chip.id}
							aria-pressed={isSelected}
							onClick={() => onSelect?.(chip.id)}
							className={`min-h-12 flex-1 cursor-pointer rounded-pill border-[1.5px] px-3.5 text-[15px] font-medium ${
								isSelected
									? "border-ink bg-ink text-cream"
									: "border-line bg-lifted text-ink"
							}`}
						>
							{t(chip.key, lang)}
						</PlainButton>
					);
				})}
			</HStack>

			<PlainButton
				onClick={onEdit}
				className="cursor-pointer self-start py-2 text-[14.5px] font-medium text-ink underline underline-offset-[3px]"
			>
				{t("checkIn.edit", lang)}
			</PlainButton>

			<Button
				label={saving ? t("checkIn.saving", lang) : t("checkIn.confirm", lang)}
				variant="primary"
				isDisabled={saving}
				onClick={onConfirm}
			/>

			<PlainButton
				onClick={onSkip}
				className="cursor-pointer self-center py-2 text-[14.5px] text-slate underline underline-offset-[3px]"
			>
				{t("checkIn.skip", lang)}
			</PlainButton>
		</Stack>
	);
};
