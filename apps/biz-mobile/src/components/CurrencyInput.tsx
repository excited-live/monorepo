import React, { useRef, useLayoutEffect } from "react";

export const formatCurrencyString = (val: string | number | undefined | null): string => {
	if (val === undefined || val === null || val === "") return "";
	const s = String(val).replace(/,/g, "");
	if (s === "") return "";

	const isNegative = s.startsWith("-");
	const clean = isNegative ? s.slice(1) : s;

	const parts = clean.split(".");
	let rawInt = parts[0]?.replace(/\D/g, "") || "";
	if (rawInt.length > 1 && rawInt.startsWith("0")) {
		rawInt = rawInt.replace(/^0+/, "") || "0";
	}

	let formattedInt = "";
	if (rawInt) {
		formattedInt = rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	if (parts.length > 1) {
		const dec = parts[1]?.replace(/\D/g, "").slice(0, 2) ?? "";
		return (isNegative ? "-" : "") + (formattedInt || "0") + "." + dec;
	}
	return (isNegative ? "-" : "") + formattedInt;
};

export interface CurrencyInputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
	value: string | number;
	onChange: (cleanValue: string) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
	value,
	onChange,
	className = "form-input",
	placeholder = "0.00",
	...props
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const cursorTargetRef = useRef<number | null>(null);

	const displayVal = formatCurrencyString(value);

	useLayoutEffect(() => {
		if (cursorTargetRef.current !== null && inputRef.current) {
			const target = cursorTargetRef.current;
			inputRef.current.setSelectionRange(target, target);
			cursorTargetRef.current = null;
		}
	}, [displayVal]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputEl = e.target;
		const rawInput = inputEl.value;
		const selStart = inputEl.selectionStart ?? rawInput.length;

		// Calculate how many digits/dots were before the cursor before reformating
		const substrBeforeCursor = rawInput.slice(0, selStart);
		const meaningfulCharsBefore = substrBeforeCursor.replace(/,/g, "");

		// Strip commas to get raw value
		const clean = rawInput.replace(/,/g, "");

		// Only allow valid number format (digits and at most one decimal point)
		if (clean !== "" && !/^\d*\.?\d*$/.test(clean)) {
			return;
		}

		// Calculate what the new formatted display value will be
		const nextFormatted = formatCurrencyString(clean);

		// Determine new cursor position based on meaningful characters
		let newCursorPos = 0;
		let meaningfulCount = 0;
		for (let i = 0; i < nextFormatted.length; i++) {
			if (meaningfulCount >= meaningfulCharsBefore.length) {
				newCursorPos = i;
				break;
			}
			if (nextFormatted[i] !== ",") {
				meaningfulCount++;
			}
			newCursorPos = i + 1;
		}

		cursorTargetRef.current = newCursorPos;
		onChange(clean);
	};

	return (
		<input
			{...props}
			ref={inputRef}
			type="text"
			inputMode="decimal"
			className={className}
			placeholder={placeholder}
			value={displayVal}
			onChange={handleChange}
		/>
	);
};
