import React from "react";
import { parseYearMonth } from "@excited-live/biz";
import { useBiz } from "../state";

const formatMonthName = (ym: string) => {
	const [year, month] = ym.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const MonthStepper: React.FC = () => {
	const { selectedMonth, setSelectedMonth } = useBiz();

	const shiftMonth = (delta: number) => {
		const { year, month } = parseYearMonth(selectedMonth);
		const zeroBased = month - 1 + delta;
		const nextYear = year + Math.floor(zeroBased / 12);
		const nextMonth = ((zeroBased % 12) + 12) % 12 + 1;
		setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
	};

	return (
		<div className="month-stepper-bar">
			<button
				type="button"
				className="stepper-btn"
				onClick={() => shiftMonth(-1)}
				aria-label="Previous Month"
			>
				‹
			</button>
			<span className="stepper-label">{formatMonthName(selectedMonth)}</span>
			<button
				type="button"
				className="stepper-btn"
				onClick={() => shiftMonth(1)}
				aria-label="Next Month"
			>
				›
			</button>
		</div>
	);
};
