/**
 * Bulletproof currency / number formatting for mobile WebViews
 * Handles undefined, null, NaN, strings, and missing Intl locales gracefully
 */
export function formatMoney(val: unknown, decimals: number = 0): string {
	if (val === null || val === undefined || val === "") {
		return decimals > 0 ? "0.00" : "0";
	}
	const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
	if (isNaN(num) || !isFinite(num)) {
		return decimals > 0 ? "0.00" : "0";
	}
	try {
		return num.toLocaleString("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});
	} catch {
		// Bulletproof regex fallback for older/restricted WebViews
		const parts = num.toFixed(decimals).split(".");
		parts[0] = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	}
}
