import React, { useRef } from "react";
import { parseYearMonth } from "@excited-live/biz";
import { useBiz } from "../state";

const formatMonthName = (ym: string) => {
	const [year, month] = ym.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const MonthStepper: React.FC = () => {
	const { selectedMonth, setSelectedMonth } = useBiz();
	const monthInputRef = useRef<HTMLInputElement>(null);

	const shiftMonth = (delta: number) => {
		const { year, month } = parseYearMonth(selectedMonth);
		const zeroBased = month - 1 + delta;
		const nextYear = year + Math.floor(zeroBased / 12);
		const nextMonth = ((zeroBased % 12) + 12) % 12 + 1;
		setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
	};

	const handleOpenPicker = () => {
		if (monthInputRef.current) {
			if ("showPicker" in HTMLInputElement.prototype) {
				try {
					monthInputRef.current.showPicker();
				} catch {
					monthInputRef.current.focus();
				}
			} else {
				monthInputRef.current.focus();
			}
		}
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
			<button
				type="button"
				className="stepper-label-btn"
				onClick={handleOpenPicker}
				title="Tap to select month"
				aria-label={`Selected month: ${formatMonthName(selectedMonth)}. Tap to change`}
			>
				<span className="stepper-label">{formatMonthName(selectedMonth)}</span>
				<svg
					className="stepper-picker-icon"
					viewBox="0 0 20 20"
					fill="currentColor"
					width="14"
					height="14"
					aria-hidden="true"
				>
					<path
						fillRule="evenodd"
						d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
						clipRule="evenodd"
					/>
				</svg>
				<input
					ref={monthInputRef}
					type="month"
					className="stepper-hidden-input"
					value={selectedMonth}
					onChange={(e) => {
						if (e.target.value) {
							setSelectedMonth(e.target.value);
						}
					}}
					aria-hidden="true"
					tabIndex={-1}
				/>
			</button>
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
