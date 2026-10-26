import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlainButton } from "@excited-live/design-system";
import type { MobileLocale } from "../../domain/types";
import type { ConfidenceBand } from "../../domain/weekLoop";
import { t } from "../../i18n";
import { ConfidenceMeter } from "../ConfidenceMeter";

/**
 * DecisionCard — the advisory suggestion pattern (#102).
 *
 * A port of `ds-excited-live/ui_kits/app/components/DecisionCard.jsx`, split so
 * the band meter is the shared `ConfidenceMeter` rather than a second copy of
 * three segments (amendment 2 R1). This is the only decision card in the app.
 *
 * The hedge, the why, the band and the exit are not optional: they are what
 * makes a cheap, always-available suggestion layer safe to disagree with.
 * Nothing is ever applied without a tap, and the one-card-a-day cap is a
 * ceiling — a day with nothing worth saying shows no card at all (R2).
 */

export type DecisionState = "suggested" | "accepted" | "adjusted" | "dismissed";

export interface DecisionCardProps {
	band?: ConfidenceBand;
	state?: DecisionState;
	/** The suggestion itself, already hedged ("We think…"). */
	suggestion: string;
	/** One evidence-shaped line: "your burn fell 18%", not a vibe. */
	why: string;
	/** Shown instead of `why` when the person adjusted the card. */
	updateReason?: string | null;
	/** e.g. "sim 1.4.0 · updated 2h ago". Omit when there is nothing honest to say. */
	provenance?: string;
	/** Formatted date shown in the accepted receipt. */
	decidedOn?: string;
	onAccept?: () => void;
	onAdjust?: () => void;
	onDismiss?: () => void;
	onUndo?: () => void;
	onShowMath?: () => void;
	onShowWhatChanges?: () => void;
	lang: MobileLocale;
}

const EYEBROW_KEY: Record<DecisionState, string> = {
	suggested: "decision.eyebrow.suggestion",
	accepted: "decision.eyebrow.accepted",
	adjusted: "decision.eyebrow.updated",
	dismissed: "decision.eyebrow.dismissed",
};

export const DecisionCard: React.FC<DecisionCardProps> = ({
	band = "medium",
	state = "suggested",
	suggestion,
	why,
	updateReason = null,
	provenance,
	decidedOn,
	onAccept,
	onAdjust,
	onDismiss,
	onUndo,
	onShowMath,
	onShowWhatChanges,
	lang,
}) => {
	const isDecided = state === "accepted" || state === "dismissed";
	const adjusted = state === "adjusted";
	const receipt =
		state === "accepted"
			? decidedOn
				? t("decision.receipt.acceptedOn", lang, { date: decidedOn })
				: t("decision.receipt.accepted", lang)
			: t("decision.receipt.dismissed", lang);

	return (
		<Stack
			as="article"
			aria-label={t("decision.a11y.label", lang)}
			gap={3}
			className="w-full min-w-0 rounded-element border border-line bg-lifted p-5 shadow-card"
		>
			<HStack width="100%" justify="between" align="center" gap={3}>
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t(EYEBROW_KEY[state], lang)}
				</Text>
				{!isDecided && <ConfidenceMeter band={band} lang={lang} />}
			</HStack>

			{isDecided ? (
				<HStack
					role="status"
					aria-live="polite"
					gap={3}
					align="center"
					className="rounded-[14px] bg-ink/5 px-3.5 py-3"
				>
					<Text className="grid size-[22px] shrink-0 place-items-center rounded-pill border-[1.5px] border-ink text-[12px]">
						{state === "accepted" ? "✓" : "–"}
					</Text>
					<Text className="flex-1 text-[14px] text-charcoal">{receipt}</Text>
					{onUndo && (
						<PlainButton
							onClick={onUndo}
							className="ml-auto cursor-pointer text-[14px] text-charcoal underline underline-offset-[3px]"
						>
							{t("decision.undo", lang)}
						</PlainButton>
					)}
				</HStack>
			) : (
				<>
					<Text className="text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
						{suggestion}
					</Text>
					<Text className="text-[14.5px] leading-normal text-slate">
						<Text as="span" className="font-medium text-charcoal">
							{adjusted && updateReason
								? t("decision.updatedBecause", lang, { reason: updateReason })
								: t("decision.why", lang, { why })}
						</Text>
					</Text>
					{(onShowMath || onShowWhatChanges) && (
						<HStack gap={4} wrap="wrap" align="center">
							{onShowMath && (
								<PlainButton
									onClick={onShowMath}
									className="cursor-pointer text-[14px] font-medium text-ink underline underline-offset-[3px]"
								>
									{t("decision.showMath", lang)}
								</PlainButton>
							)}
							{onShowWhatChanges && (
								<PlainButton
									onClick={onShowWhatChanges}
									className="cursor-pointer text-[14px] font-medium text-ink underline underline-offset-[3px]"
								>
									{t("decision.whatChanges", lang)}
								</PlainButton>
							)}
						</HStack>
					)}
					<HStack gap={3} wrap="wrap" align="center">
						<Button label={t("decision.accept", lang)} variant="primary" onClick={onAccept} />
						<Button label={t("decision.adjust", lang)} variant="secondary" onClick={onAdjust} />
						<PlainButton
							onClick={onDismiss}
							className="ml-auto cursor-pointer px-1.5 text-[14px] text-slate underline underline-offset-[3px]"
						>
							{t("decision.dismiss", lang)}
						</PlainButton>
					</HStack>
					{provenance && <Text className="text-[12px] text-slate">{provenance}</Text>}
				</>
			)}
		</Stack>
	);
};
