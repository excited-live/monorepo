/** Formatting helpers — one currency, one locale, tabular in tables. */

const thb = new Intl.NumberFormat("en-TH", {
	style: "currency",
	currency: "THB",
	maximumFractionDigits: 0,
})

const thbPrecise = new Intl.NumberFormat("en-TH", {
	style: "currency",
	currency: "THB",
	maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

export function formatThb(value: number | null | undefined): string {
	return typeof value === "number" && Number.isFinite(value) ? thb.format(value) : "—"
}

export function formatThbPrecise(value: number | null | undefined): string {
	return typeof value === "number" && Number.isFinite(value) ? thbPrecise.format(value) : "—"
}

export function formatCompact(value: number | null | undefined): string {
	return typeof value === "number" && Number.isFinite(value) ? compact.format(value) : "—"
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
	if (typeof value !== "number" || !Number.isFinite(value)) return "—"
	return `${(value * 100).toFixed(digits)}%`
}

/** `2026-10` → `Oct 2026`; other shapes are returned unchanged. */
export function formatMonth(yearMonth: string | null | undefined): string {
	if (!yearMonth) return "—"
	const match = /^(\d{4})-(\d{2})$/.exec(yearMonth)
	if (!match) return yearMonth
	const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
	return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

/** Relative time for "last used" chips; accepts ISO strings or epoch ms. */
export function formatRelative(value: string | number | Date | null | undefined): string {
	if (!value) return "never"
	const date = value instanceof Date ? value : new Date(value)
	const diff = Date.now() - date.getTime()
	if (!Number.isFinite(diff)) return "never"
	const minutes = Math.round(diff / 60_000)
	if (minutes < 1) return "just now"
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	return `${days}d ago`
}
