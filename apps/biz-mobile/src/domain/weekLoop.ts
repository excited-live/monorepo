/**
 * Week-one loop — pure logic for the post-activation return surfaces (#102).
 *
 * Design of record:
 *   OpenDesign `week-one-loop/week-one-loop-spec-2026-10-25.md`
 *   + amendment 1 (band source, check-in payload) + amendment 2 (R1-R7 rulings)
 *
 * Nothing here renders, reads storage or calls the network: the surfaces take
 * these models as props, so every rule below is unit-tested without a browser.
 */

/** Confidence is a band with a word, never a percentage, score or star. */
export type ConfidenceBand = "high" | "medium" | "low";

/** S1 `week strip` variants. There is deliberately no "blank" state. */
export type WeekStripVariant = "fresh" | "stale" | "empty";

/** A day slot, left to right, Monday first. */
export type WeekDayState = "done" | "quiet" | "today" | "future";

export interface WeekDayInput {
	/** Calendar date, `YYYY-MM-DD`, in the account's local timezone. */
	date: string;
	/** True when that day has a saved check-in. */
	checkedIn: boolean;
}

export interface WeekDay extends WeekDayInput {
	state: WeekDayState;
	/** 0 = Monday … 6 = Sunday, used to pick the letter from the dictionary. */
	index: number;
}

export interface WeekStripModel {
	variant: WeekStripVariant;
	days: WeekDay[];
	/** Days with a check-in inside this week. */
	doneCount: number;
	/** Days since the last check-in; only meaningful for `stale`. */
	quietDays: number;
}

/** Two days of `YYYY-MM-DD` differ by whole days (UTC-normalised, DST-free). */
export function daysBetween(from: string, to: string): number {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(a) || Number.isNaN(b)) return 0;
	return Math.round((b - a) / 86_400_000);
}

/** Monday of the week that contains `date`. */
export function weekStart(date: string): string {
	const at = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(at)) return date;
	const weekday = new Date(at).getUTCDay(); // 0 = Sunday
	const offset = weekday === 0 ? 6 : weekday - 1;
	return new Date(at - offset * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Build the seven-slot strip.
 *
 * - `fresh`  — a check-in exists today (data is at most 24 h old).
 * - `stale`  — the last check-in is older than today; `quietDays` says how long.
 * - `empty`  — no check-in has ever been saved. Still shows the outline of the
 *              week, because a blank home is the problem this surface exists for.
 *
 * A missed day is `quiet`, never an error: the loop wants people to return, not
 * to protect a streak.
 */
export function buildWeekStrip(input: {
	today: string;
	days: WeekDayInput[];
}): WeekStripModel {
	const start = weekStart(input.today);
	const byDate = new Map(input.days.map((day) => [day.date, day.checkedIn]));

	const days: WeekDay[] = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(Date.parse(`${start}T00:00:00Z`) + index * 86_400_000)
			.toISOString()
			.slice(0, 10);
		const checkedIn = byDate.get(date) === true;
		return { date, checkedIn, index, state: dayState(date, checkedIn, input.today) };
	});

	const pastCheckIns = input.days
		.filter((day) => day.checkedIn && daysBetween(day.date, input.today) >= 0)
		.sort((a, b) => daysBetween(a.date, input.today) - daysBetween(b.date, input.today));

	const latest = pastCheckIns[0];
	// `pastCheckIns` is sorted most-recent-first, so the first entry is the last
	// check-in; anything outside the rendered week still counts for `stale`.
	const latestDate = latest ? latest.date : null;
	const doneCount = days.filter((day) => day.state === "done").length;

	if (latestDate === null) {
		return { variant: "empty", days, doneCount: 0, quietDays: 0 };
	}

	const quietDays = Math.max(0, daysBetween(latestDate, input.today));
	return {
		variant: quietDays === 0 ? "fresh" : "stale",
		days,
		doneCount,
		quietDays,
	};
}

function dayState(date: string, checkedIn: boolean, today: string): WeekDayState {
	const forward = daysBetween(today, date);
	if (forward > 0) return "future";
	if (forward === 0) return checkedIn ? "done" : "today";
	return checkedIn ? "done" : "quiet";
}

/**
 * R2 — a decision is identified by *what* it is about, not by when it was
 * rendered, so `decision_view` → `decision_accept` joins. One card per day is a
 * ceiling: an engine with nothing worth saying returns no card at all.
 */
export function decisionId(entityId: string, date: string, kind: string): string {
	return `${entityId}:${date}:${kind}`;
}

/** Evening check-in chip: the person's answer about *amount*, not closeness. */
export type CheckInAnswer = "same" | "less" | "more";

/** R4 — the stored event property, which answers *closeness*. */
export type CheckInDeviation = "planned" | "off" | "way_off";

/** How far an exact amount must sit from the guess to count as `way_off`. */
export const CHECK_IN_WAY_OFF_RATIO = 0.5;

/**
 * R4 — map the chip (plus an optional exact amount) to the value written into
 * `details.checkin`. The chips stay worded for amount; magnitude is inferred,
 * never asked. No free text, because S5 derives accuracy from these values.
 */
export function deviationFor(
	answer: CheckInAnswer,
	options: { guess?: number; exact?: number } = {},
): CheckInDeviation {
	const { guess, exact } = options;
	if (typeof exact === "number" && Number.isFinite(exact)) {
		if (typeof guess === "number" && Number.isFinite(guess) && guess > 0) {
			const drift = Math.abs(exact - guess) / guess;
			return drift > CHECK_IN_WAY_OFF_RATIO ? "way_off" : "off";
		}
		// No usable guess: an entered amount is a correction, so it is never
		// reported as "planned".
		return "off";
	}
	return answer === "same" ? "planned" : "off";
}

/** Day-7 verdict. `on-target` only when the actual landed inside the band. */
export type RecapVerdict = "on-target" | "over" | "under";

export function recapVerdict(actual: number, predictedLow: number, predictedHigh: number): RecapVerdict {
	if (actual >= predictedLow && actual <= predictedHigh) return "on-target";
	return actual > predictedHigh ? "over" : "under";
}

/**
 * How far outside the predicted band the week landed, in currency units. Zero
 * when on target — the recap never invents a gap to look precise.
 */
export function recapGap(actual: number, predictedLow: number, predictedHigh: number): number {
	const verdict = recapVerdict(actual, predictedLow, predictedHigh);
	if (verdict === "over") return Math.round(actual - predictedHigh);
	if (verdict === "under") return Math.round(predictedLow - actual);
	return 0;
}

/**
 * Amendment 2 §2 — the v1 band comes from data depth, because the published
 * projection has no simulation behind it. Two weeks of spending is enough to
 * call the direction; a full month before the band is called `high`.
 *
 * These thresholds are engineering's proposal for Design to ratify; they are
 * the one number in this loop that is not in the spec.
 */
export const BAND_DEPTH = { high: 14, medium: 7 } as const;

export function bandFromDepth(daysOfData: number): ConfidenceBand {
	if (daysOfData >= BAND_DEPTH.high) return "high";
	if (daysOfData >= BAND_DEPTH.medium) return "medium";
	return "low";
}

/**
 * A week that moved more than 10% week-over-week is one notch less certain:
 * the past is a weaker guide to a week that is behaving differently.
 */
export function downgradeBand(band: ConfidenceBand, weekOverWeekChange: number): ConfidenceBand {
	if (Math.abs(weekOverWeekChange) <= 0.1) return band;
	if (band === "high") return "medium";
	if (band === "medium") return "low";
	return "low";
}
