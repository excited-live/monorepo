import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlainButton } from "@excited-live/design-system";
import type { MobileLocale } from "../../../../domain/types";
import type { ConfidenceBand, RecapVerdict } from "../../../../domain/weekLoop";
import { t } from "../../../../i18n";
import { formatMoney } from "../../../../utils/format";
import { ConfidenceMeter } from "../../../../components/ConfidenceMeter";

/**
 * HomeWeekRecap — S5 of the week-one loop (#102).
 *
 * Predicted vs actual for the first seven days, then exactly one next action.
 * Showing the miss is the point: a recap that only reports hits teaches people
 * to distrust the next projection. If accuracy was poor, say so.
 *
 * Nothing auto-applies; the action is one tap and dismissible.
 */

export interface HomeWeekRecapProps {
	verdict: RecapVerdict;
	predictedLow: number;
	predictedHigh: number;
	actual: number;
	band?: ConfidenceBand;
	/** One honest sentence about why the band missed; omit rather than genericise. */
	why?: string;
	checkIns: number;
	targetCheckIns: number;
	nextActionLabel: string;
	nextActionDetail?: string;
	onNextAction?: () => void;
	onDismiss?: () => void;
	onShare?: () => void;
	lang: MobileLocale;
}

export const HomeWeekRecap: React.FC<HomeWeekRecapProps> = ({
	verdict,
	predictedLow,
	predictedHigh,
	actual,
	band = "medium",
	why,
	checkIns,
	targetCheckIns,
	nextActionLabel,
	nextActionDetail,
	onNextAction,
	onDismiss,
	onShare,
	lang,
}) => {
	const gap = Math.abs(Math.round(verdict === "over" ? actual - predictedHigh : predictedLow - actual));
	const verdictText =
		verdict === "on-target"
			? t("recap.verdict.onTarget", lang)
			: verdict === "over"
				? t("recap.verdict.over", lang, { gap: formatMoney(gap) })
				: t("recap.verdict.under", lang, { gap: formatMoney(gap) });

	return (
		<Stack
			as="article"
			aria-label={t("recap.a11y.label", lang)}
			gap={4}
			className="w-full min-w-0 rounded-element border border-line bg-lifted p-5 shadow-card"
		>
			<HStack width="100%" justify="between" align="center" gap={3}>
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t("recap.title", lang)}
				</Text>
				<ConfidenceMeter band={band} lang={lang} />
			</HStack>

			{/* the miss is the headline, not a footnote */}
			<Text className="text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
				{verdictText}
			</Text>

			<HStack gap={3} align="stretch" className="w-full">
				<Stack gap={1} className="flex-1 rounded-[14px] bg-ink/[0.04] px-4 py-3.5">
					<Text className="text-[12px] font-semibold uppercase tracking-[0.04em] text-slate">
						{t("recap.col.predicted", lang)}
					</Text>
					<Text className="text-[20px] font-medium tracking-[-0.01em] text-ink">
						฿{formatMoney(predictedLow)}–{formatMoney(predictedHigh)}
					</Text>
				</Stack>
				<Stack gap={1} className="flex-1 rounded-[14px] bg-ink px-4 py-3.5">
					<Text className="text-[12px] font-semibold uppercase tracking-[0.04em] text-cream/70">
						{t("recap.col.actual", lang)}
					</Text>
					<Text className="text-[24px] font-medium tracking-[-0.01em] text-cream">
						฿{formatMoney(actual)}
					</Text>
				</Stack>
			</HStack>

			{why && (
				<Text className="text-[14.5px] leading-normal text-charcoal">
					{t("recap.whyMissed", lang, { why })}
				</Text>
			)}

			<HStack gap={3} align="center" wrap="wrap">
				<Text className="text-[13.5px] text-slate">
					{t("recap.checkIns", lang, { n: String(checkIns), total: String(targetCheckIns) })}
				</Text>
				<Text className="text-[13.5px] text-slate" aria-hidden="true">
					·
				</Text>
				<Text className="text-[13.5px] text-slate">{t("recap.noStreaks", lang)}</Text>
			</HStack>

			<Stack gap={3} className="rounded-[14px] bg-ink/[0.04] p-4">
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t("recap.nextLabel", lang)}
				</Text>
				<Text className="text-[16px] font-medium leading-[1.4] text-ink">{nextActionLabel}</Text>
				{nextActionDetail && <Text className="text-[14px] text-slate">{nextActionDetail}</Text>}
				<HStack gap={3} align="center" wrap="wrap">
					<Button label={nextActionLabel} variant="primary" onClick={onNextAction} />
					<PlainButton
						onClick={onDismiss}
						className="cursor-pointer py-2 text-[14px] text-slate underline underline-offset-[3px]"
					>
						{t("recap.notNow", lang)}
					</PlainButton>
				</HStack>
			</Stack>

			{onShare && (
				<PlainButton
					onClick={onShare}
					className="cursor-pointer self-start py-2 text-[14px] text-slate underline underline-offset-[3px]"
				>
					{t("recap.share", lang)}
				</PlainButton>
			)}
		</Stack>
	);
};
