import React from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import type { MobileLocale } from "../../domain/types";
import type { ConfidenceBand } from "../../domain/weekLoop";
import { t } from "../../i18n";

/**
 * The one three-segment confidence meter (#102, amendment 2 R1).
 *
 * Every surface that shows a projection — `HomeProjectionCard`, `HomeWeekRecap`,
 * `DecisionCard` — imports this. None of them renders its own segments and none
 * of them spells a band word: the words come from `confidence.*` here, so
 * "High / Medium / Low" has exactly one home.
 *
 * Confidence is a word plus segments. Never a percentage, score, star or decimal:
 * a simulated probability is evidence ("of 10,000 runs"), not confidence.
 */

const FILLED: Record<ConfidenceBand, number> = { high: 3, medium: 2, low: 1 };

/** Band tone uses the existing palette only: ink, slate, clay. No new token. */
const TONE: Record<ConfidenceBand, string> = {
	high: "border-ink bg-ink",
	medium: "border-slate bg-slate",
	low: "border-clay bg-clay",
};

/** The sentence a band is allowed to claim, so no surface paraphrases it. */
export const CONFIDENCE_HEDGE_KEY: Record<ConfidenceBand, string> = {
	high: "confidence.hedge.high",
	medium: "confidence.hedge.medium",
	low: "confidence.hedge.low",
};

export function confidenceLabelKey(band: ConfidenceBand): string {
	return `confidence.${band}`;
}

export interface ConfidenceMeterProps {
	band?: ConfidenceBand;
	/** `sm` sits in a card header; `md` is a standalone row. */
	size?: "sm" | "md";
	showLabel?: boolean;
	lang: MobileLocale;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
	band = "medium",
	size = "sm",
	showLabel = true,
	lang,
}) => {
	const key: ConfidenceBand = band in FILLED ? band : "medium";
	const filled = FILLED[key];
	const label = t(confidenceLabelKey(key), lang).toLowerCase();

	return (
		<HStack
			gap={2}
			align="center"
			role="img"
			aria-label={t("confidence.a11y", lang, { band: label })}
			className="shrink-0 whitespace-nowrap"
		>
			<HStack gap={1} align="center" aria-hidden="true">
				{[0, 1, 2].map((index) => (
					<span
						key={index}
						className={`block rounded-pill border ${
							size === "md" ? "h-2 w-[26px]" : "h-1.5 w-4"
						} ${index < filled ? TONE[key] : "border-line-strong bg-transparent"}`}
					/>
				))}
			</HStack>
			{showLabel && (
				<Text
					className={`font-medium text-charcoal ${
						size === "md" ? "text-[15px]" : "text-[13px]"
					}`}
				>
					{t(confidenceLabelKey(key), lang)}
				</Text>
			)}
		</HStack>
	);
};
