import { describe, expect, it } from "vitest";
import {
	BAND_DEPTH,
	bandFromDepth,
	buildWeekStrip,
	CHECK_IN_WAY_OFF_RATIO,
	decisionId,
	deviationFor,
	downgradeBand,
	recapGap,
	recapVerdict,
	weekStart,
} from "./weekLoop";

// Wednesday 2026-10-28 → the strip runs Mon 26 Oct … Sun 1 Nov.
const TODAY = "2026-10-28";

describe("buildWeekStrip", () => {
	it("renders seven slots Monday first even with no data at all", () => {
		const strip = buildWeekStrip({ today: TODAY, days: [] });
		expect(strip.variant).toBe("empty");
		expect(strip.days).toHaveLength(7);
		expect(strip.days.map((day) => day.date)).toEqual([
			"2026-10-26",
			"2026-10-27",
			"2026-10-28",
			"2026-10-29",
			"2026-10-30",
			"2026-10-31",
			"2026-11-01",
		]);
		expect(strip.doneCount).toBe(0);
	});

	it("marks today, past-and-empty and future slots distinctly", () => {
		const strip = buildWeekStrip({ today: TODAY, days: [] });
		expect(strip.days.map((day) => day.state)).toEqual([
			"quiet",
			"quiet",
			"today",
			"future",
			"future",
			"future",
			"future",
		]);
	});

	it("is fresh when today has a check-in and counts the week's done days", () => {
		const strip = buildWeekStrip({
			today: TODAY,
			days: [
				{ date: "2026-10-26", checkedIn: true },
				{ date: "2026-10-28", checkedIn: true },
			],
		});
		expect(strip.variant).toBe("fresh");
		expect(strip.quietDays).toBe(0);
		expect(strip.doneCount).toBe(2);
		expect(strip.days[2]?.state).toBe("done");
	});

	it("is stale with the number of quiet days when the last check-in is older", () => {
		const strip = buildWeekStrip({
			today: TODAY,
			days: [{ date: "2026-10-24", checkedIn: true }],
		});
		expect(strip.variant).toBe("stale");
		expect(strip.quietDays).toBe(4);
		// The older check-in is outside this week, so no slot inside it is done.
		expect(strip.doneCount).toBe(0);
	});

	it("ignores future-dated check-ins so a clock skew cannot fake a streak", () => {
		const strip = buildWeekStrip({
			today: TODAY,
			days: [{ date: "2026-11-03", checkedIn: true }],
		});
		expect(strip.variant).toBe("empty");
		expect(strip.days[6]?.state).toBe("future");
	});
});

describe("weekStart", () => {
	it("returns the Monday of the containing week, including on a Sunday", () => {
		expect(weekStart("2026-10-28")).toBe("2026-10-26");
		expect(weekStart("2026-11-01")).toBe("2026-10-26");
		expect(weekStart("2026-10-26")).toBe("2026-10-26");
	});
});

describe("decisionId", () => {
	it("is deterministic per entity, day and kind (R2)", () => {
		expect(decisionId("acc_personal", TODAY, "cashflow")).toBe("acc_personal:2026-10-28:cashflow");
		expect(decisionId("acc_personal", TODAY, "cashflow")).toBe(
			decisionId("acc_personal", TODAY, "cashflow"),
		);
		expect(decisionId("acc_personal", TODAY, "cashflow")).not.toBe(
			decisionId("acc_personal", "2026-10-29", "cashflow"),
		);
	});
});

describe("deviationFor (R4)", () => {
	it("stores the same-answer as planned and a direction chip as off", () => {
		expect(deviationFor("same")).toBe("planned");
		expect(deviationFor("less")).toBe("off");
		expect(deviationFor("more")).toBe("off");
	});

	it("infers way_off only from an exact amount outside the ratio", () => {
		expect(deviationFor("more", { guess: 400, exact: 500 })).toBe("off");
		expect(deviationFor("more", { guess: 400, exact: 400 * (1 + CHECK_IN_WAY_OFF_RATIO) + 1 })).toBe(
			"way_off",
		);
		expect(deviationFor("less", { guess: 400, exact: 100 })).toBe("way_off");
	});

	it("never claims planned when the person typed an amount", () => {
		expect(deviationFor("same", { exact: 420 })).toBe("off");
	});
});

describe("recap verdict", () => {
	it("is on-target inside the band, inclusive at both ends", () => {
		expect(recapVerdict(4100, 4100, 4600)).toBe("on-target");
		expect(recapVerdict(4600, 4100, 4600)).toBe("on-target");
		expect(recapVerdict(4400, 4100, 4600)).toBe("on-target");
	});

	it("reports over/under and the gap in currency units", () => {
		expect(recapVerdict(5320, 4100, 4600)).toBe("over");
		expect(recapGap(5320, 4100, 4600)).toBe(720);
		expect(recapVerdict(3900, 4100, 4600)).toBe("under");
		expect(recapGap(3900, 4100, 4600)).toBe(200);
		expect(recapGap(4400, 4100, 4600)).toBe(0);
	});
});

describe("confidence band from data depth", () => {
	it("steps at the documented thresholds", () => {
		expect(bandFromDepth(BAND_DEPTH.high - 1)).toBe("medium");
		expect(bandFromDepth(BAND_DEPTH.high)).toBe("high");
		expect(bandFromDepth(BAND_DEPTH.medium - 1)).toBe("low");
		expect(bandFromDepth(0)).toBe("low");
	});

	it("downgrades one notch on a move larger than 10%, and never upgrades", () => {
		expect(downgradeBand("high", 0.05)).toBe("high");
		expect(downgradeBand("high", 0.18)).toBe("medium");
		expect(downgradeBand("medium", -0.25)).toBe("low");
		expect(downgradeBand("low", 0.4)).toBe("low");
	});
});
