import type { MobileLocale } from "../../../../domain/types";
import { t } from "../../../../i18n";

/**
 * Week-strip day labels (#168).
 *
 * One dictionary key per day, Monday first, so the strip never splits a
 * translated sentence to find its seven slots. `short` is the glyph under the
 * dot; `full` is the day's real name, used in `aria-label` — Thai initials are
 * ambiguous on purpose (อ = Tuesday and Sunday, พ = Wednesday and Thursday), so
 * a screen reader must hear the name, not the initial.
 */

/** Monday → Sunday; the index is `WeekDay.index`. */
export const WEEK_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number];

export interface WeekDayLabel {
	/** The visible glyph, e.g. `M` / `จ.`. */
	short: string;
	/** The unambiguous day name, e.g. `Monday` / `วันจันทร์`. */
	full: string;
}

const shortKey = (day: WeekDayKey) => `week.strip.dayShort.${day}`;
const fullKey = (day: WeekDayKey) => `week.strip.dayFull.${day}`;

/** Seven labels, Monday first. Always seven: a missing key renders as the key itself. */
export function weekDayLabels(lang: MobileLocale): WeekDayLabel[] {
	return WEEK_DAY_KEYS.map((day) => ({
		short: t(shortKey(day), lang),
		full: t(fullKey(day), lang),
	}));
}
