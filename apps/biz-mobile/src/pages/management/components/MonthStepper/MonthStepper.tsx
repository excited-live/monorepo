import React, { useRef } from "react";
import { NativeInput, PlainButton, Svg, SvgPath } from "@excited-live/design-system";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { GLASS_PILL } from "../../../../utils/ui";
import { parseYearMonth } from "@excited-live/biz";
import { useBiz } from "../../../../state";

const STEP_BTN =
	"cursor-pointer rounded-pill px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:bg-ink/5 active:bg-ink/10";

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
		const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
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
		<HStack width="100%" justify="between" align="center" className={`min-w-0 px-3 py-1.5 ${GLASS_PILL}`}>
			<PlainButton className={STEP_BTN} onClick={() => shiftMonth(-1)} aria-label="Previous Month">
				‹
			</PlainButton>
			<PlainButton
				className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-2.5 py-1 transition-colors duration-150 hover:bg-ink/5 active:bg-ink/10"
				onClick={handleOpenPicker}
				title="Tap to select month"
				aria-label={`Selected month: ${formatMonthName(selectedMonth)}. Tap to change`}
			>
				<Text className="text-[15px] font-bold text-ink">{formatMonthName(selectedMonth)}</Text>
				<Svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true" className="text-slate">
					<SvgPath
						fillRule="evenodd"
						d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
						clipRule="evenodd"
					/>
				</Svg>
				<NativeInput
					ref={monthInputRef}
					type="month"
					className="pointer-events-none absolute size-px opacity-0 [clip:rect(0,0,0,0)]"
					value={selectedMonth}
					onChange={(e) => {
						if (e.target.value) {
							setSelectedMonth(e.target.value);
						}
					}}
					aria-hidden="true"
					tabIndex={-1}
				/>
			</PlainButton>
			<PlainButton className={STEP_BTN} onClick={() => shiftMonth(1)} aria-label="Next Month">
				›
			</PlainButton>
		</HStack>
	);
};
