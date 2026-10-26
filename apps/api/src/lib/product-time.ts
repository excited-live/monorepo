/**
 * The product's civil calendar.
 *
 * excited.live serves Thai users first: "today" means today in Bangkok at
 * 00:30, not UTC yesterday. Every default date/month derived from the clock
 * (`asOf` fallbacks, "this month" in the MCP read tools) goes through here, or
 * a receipt entered after midnight on 1 November lands in October (#172).
 *
 * The offset is a constant rather than an `Intl` zone lookup on purpose:
 * Thailand has had no DST since 1941, and Workers' ICU data is an avoidable
 * dependency on the hot path. `PRODUCT_TZ` is the named source of truth; a
 * per-user timezone is post-launch.
 */
export const PRODUCT_TZ = "Asia/Bangkok";

/** UTC+7, in minutes. */
const PRODUCT_TZ_OFFSET_MINUTES = 7 * 60;

/** The product's current date (`YYYY-MM-DD`). */
export function productDate(now: Date = new Date()): string {
	return new Date(now.getTime() + PRODUCT_TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** The product's current month (`YYYY-MM`). */
export function productMonth(now: Date = new Date()): string {
	return productDate(now).slice(0, 7);
}
