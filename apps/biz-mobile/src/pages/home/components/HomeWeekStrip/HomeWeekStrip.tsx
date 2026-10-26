import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { PlainButton } from "@excited-live/design-system";
import type { MobileLocale } from "../../../../domain/types";
import { t } from "../../../../i18n";
import type { WeekDay, WeekStripModel } from "../../../../domain/weekLoop";

/**
 * HomeWeekStrip — S1 of the week-one loop (#102).
 *
 * The home screen must never be blank on day 2. Seven slots, three states
 * (`fresh` / `stale` / `empty`), no blank state permitted. A missed day is a
 * quiet dot, not a red mark: the goal is returning, not protecting a streak.
 */

export interface HomeWeekStripProps {
	model: WeekStripModel;
	onPrimary: () => void;
	onOpenWeek?: () => void;
	lang: MobileLocale;
}

const DAY_STATE_KEY: Record<WeekDay["state"], string> = {
	done: "week.strip.dayState.done",
	quiet: "week.strip.dayState.quiet",
	today: "week.strip.dayState.today",
	future: "week.strip.dayState.future",
};

const dotClass = (state: WeekDay["state"]): string => {
	if (state === "done") return "border-ink bg-ink text-cream";
	if (state === "today") return "border-2 border-ink bg-lifted text-ink";
	if (state === "future") return "border-transparent bg-transparent text-taupe";
	return "border-transparent bg-ink/[0.04] text-slate";
};

export const HomeWeekStrip: React.FC<HomeWeekStripProps> = ({ model, onPrimary, onOpenWeek, lang }) => {
	const { variant, days, doneCount, quietDays } = model;
	const letters = t("week.strip.days", lang).split(" ");

	const copy =
		variant === "stale"
			? t("week.strip.stale", lang, { n: String(quietDays) })
			: variant === "empty"
				? t("week.strip.empty", lang)
				: t(doneCount === 1 ? "week.strip.fresh_one" : "week.strip.fresh_other", lang, {
						n: String(doneCount),
					});

	const cta =
		variant === "stale"
			? t("week.strip.cta.stale", lang)
			: variant === "empty"
				? t("week.strip.cta.empty", lang)
				: t("week.strip.cta.fresh", lang);

	return (
		<Stack
			as="section"
			aria-label={t("week.strip.a11y.label", lang)}
			gap={3}
			className="w-full min-w-0 rounded-element border border-line bg-lifted p-[18px] shadow-card"
		>
			<HStack width="100%" justify="between" align="end" gap={3}>
				<Text className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate">
					{t("week.strip.title", lang)}
				</Text>
				{days.length > 0 && onOpenWeek && (
					<PlainButton
						onClick={onOpenWeek}
						className="cursor-pointer py-1.5 text-[14px] text-ink underline underline-offset-[3px]"
					>
						{t("week.strip.seeWeek", lang)}
					</PlainButton>
				)}
			</HStack>

			<Text className="text-[17px] font-medium leading-[1.4] tracking-[-0.01em] text-ink">{copy}</Text>

			<HStack
				aria-label={t("week.strip.a11y.days", lang)}
				justify="between"
				gap={2}
				className="w-full"
			>
				{days.map((day) => (
					<Stack
						key={day.date}
						gap={1.5}
						hAlign="center"
						className="shrink-0"
						aria-label={t("week.strip.a11y.day", lang, {
							day: letters[day.index] ?? "",
							state: t(DAY_STATE_KEY[day.state], lang),
						})}
					>
						<Text
							className={`grid size-[34px] place-items-center rounded-pill text-[13px] leading-none ${dotClass(
								day.state,
							)}`}
						>
							{day.state === "done" ? "✓" : day.state === "today" ? "•" : ""}
						</Text>
						<Text
							className={`text-[12px] ${
								day.state === "today" ? "font-semibold text-ink" : "text-slate"
							}`}
						>
							{letters[day.index] ?? ""}
						</Text>
					</Stack>
				))}
			</HStack>

			{variant === "empty" && (
				<Text className="text-[14.5px] text-slate">{t("week.strip.emptyBody", lang)}</Text>
			)}

			<Button label={cta} variant="primary" onClick={onPrimary} />
		</Stack>
	);
};
