import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlainButton } from "@excited-live/design-system";
import type { MobileLocale } from "../../../../domain/types";
import type { ConfidenceBand } from "../../../../domain/weekLoop";
import { t } from "../../../../i18n";
import { formatMoney } from "../../../../utils/format";
import { ConfidenceMeter, CONFIDENCE_HEDGE_KEY } from "../../../../components/ConfidenceMeter";

/**
 * HomeProjectionCard — S2 of the week-one loop (#102).
 *
 * The daily return trigger: one number about the week, hedged, with the band
 * and one evidence-shaped why line. It presents, it does not ask — asking is
 * `DecisionCard`'s job.
 *
 * Rules that are not cosmetic:
 *  - Hedge first ("We think"), never "You will".
 *  - A range, not false precision.
 *  - Confidence is the shared meter; the evidence is days of real spending
 *    (amendment 2 §2), never a simulated run count it cannot back up.
 *  - The empty state says what one input would unlock instead of showing a
 *    projection of zero.
 */

export type ProjectionCardState = "ready" | "stale" | "empty";

export interface HomeProjectionCardProps {
	state?: ProjectionCardState;
	band?: ConfidenceBand;
	low?: number;
	high?: number;
	/** Evidence line, already composed (e.g. "based on 12 days of your spending"). */
	why?: string;
	/** Days since the projection was computed; only used by `stale`. */
	quietDays?: number;
	onAddIncome?: () => void;
	onSeeMath?: () => void;
	onSeeWhatChanges?: () => void;
	lang: MobileLocale;
}

export const HomeProjectionCard: React.FC<HomeProjectionCardProps> = ({
	state = "ready",
	band = "medium",
	low = 0,
	high = 0,
	why,
	quietDays = 0,
	onAddIncome,
	onSeeMath,
	onSeeWhatChanges,
	lang,
}) => (
	<Stack
		as="article"
		aria-label={t("projection.a11y.label", lang)}
		gap={3}
		className="w-full min-w-0 rounded-element border border-line bg-lifted p-5 shadow-card"
	>
		<HStack width="100%" justify="between" align="center" gap={3}>
			<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
				{state === "empty"
					? t("projection.empty.title", lang)
					: t("projection.title", lang, { period: t("projection.period.week", lang) })}
			</Text>
			{state === "ready" && <ConfidenceMeter band={band} lang={lang} />}
		</HStack>

		{state === "empty" ? (
			<>
				<Text className="text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-ink">
					{t("projection.empty.body", lang)}
				</Text>
				<Text className="text-[14.5px] leading-normal text-slate">
					{t("projection.empty.note", lang)}
				</Text>
				<Button label={t("projection.empty.cta", lang)} variant="primary" onClick={onAddIncome} />
			</>
		) : (
			<>
				<HStack gap={1} align="end" className="text-ink">
					<Text className="text-[30px] font-medium leading-[1.15] tracking-[-0.02em]">
						฿{formatMoney(low)}
					</Text>
					<Text className="text-[30px] font-medium leading-[1.15] tracking-[-0.02em] text-slate">–</Text>
					<Text className="text-[30px] font-medium leading-[1.15] tracking-[-0.02em]">
						฿{formatMoney(high)}
					</Text>
				</HStack>

				<Text className="text-[14.5px] leading-normal text-slate">
					{state === "stale"
						? t("projection.stale", lang, { n: String(quietDays) })
						: why
							? t("projection.why", lang, { why })
							: null}
				</Text>

				{state === "ready" && (
					<Text className="text-[13px] text-slate">{t(CONFIDENCE_HEDGE_KEY[band], lang)}</Text>
				)}

				{(onSeeMath || onSeeWhatChanges) && (
					<HStack gap={4} wrap="wrap">
						{onSeeMath && (
							<PlainButton
								onClick={onSeeMath}
								className="cursor-pointer py-2 text-[14px] font-medium text-ink underline underline-offset-[3px]"
							>
								{t("projection.action.math", lang)}
							</PlainButton>
						)}
						{onSeeWhatChanges && (
							<PlainButton
								onClick={onSeeWhatChanges}
								className="cursor-pointer py-2 text-[14px] font-medium text-ink underline underline-offset-[3px]"
							>
								{t("projection.action.changes", lang)}
							</PlainButton>
						)}
					</HStack>
				)}
			</>
		)}
	</Stack>
);
