import { DEFAULT_BASELINE_MONTH } from "./ledger";
import { isCashAsset } from "./math";
import type { AccountingSnapshot, Asset } from "./types";

const YEAR_MONTH = /^\d{4}-\d{2}/;

/**
 * Backfills dates that older snapshots are missing, so every money stream has a
 * start and every cash wallet balance has an as-of month:
 *
 *   - Cash wallets without a dated balance (e.g. "Historical") are dated to the
 *     month the snapshot was last saved, or the entity's first transfer month
 *     if earlier, so transfers that used to count on top of them still do.
 *   - Incomes, expenses and liabilities without a startMonth start when the
 *     entity's tracking starts (its earliest cash wallet month); one-time
 *     expenses start in their charge month. endMonth stays optional.
 *
 * Pure and idempotent: records that already carry dates are left untouched.
 */
export function normalizeSnapshot(snapshot: AccountingSnapshot): AccountingSnapshot {
	const savedMonth =
		snapshot.updatedAt && YEAR_MONTH.test(snapshot.updatedAt) ? snapshot.updatedAt.slice(0, 7) : DEFAULT_BASELINE_MONTH;

	// Undated balances can't be newer than the last save, nor newer than the
	// entity's first transfer (old data counted every transfer on top of them).
	const firstTransferMonth = new Map<string, string>();
	for (const t of snapshot.transfers) {
		if (!YEAR_MONTH.test(t.date)) continue;
		const month = t.date.slice(0, 7);
		for (const entityId of [t.fromEntityId, t.toEntityId]) {
			const current = firstTransferMonth.get(entityId);
			if (!current || month < current) firstTransferMonth.set(entityId, month);
		}
	}
	const undatedWalletMonth = (entityId: string) => {
		const transferMonth = firstTransferMonth.get(entityId);
		return transferMonth && transferMonth < savedMonth ? transferMonth : savedMonth;
	};

	const hardware = snapshot.hardware.map((h): Asset =>
		isCashAsset(h) && !YEAR_MONTH.test(h.purchaseDate) ? { ...h, purchaseDate: undatedWalletMonth(h.entityId) } : h,
	);

	const trackingStart = new Map<string, string>();
	for (const h of hardware) {
		if (!isCashAsset(h)) continue;
		const month = h.purchaseDate.slice(0, 7);
		const current = trackingStart.get(h.entityId);
		if (!current || month < current) trackingStart.set(h.entityId, month);
	}
	const startFor = (entityId: string) => trackingStart.get(entityId) ?? savedMonth;

	return {
		...snapshot,
		hardware,
		revenues: snapshot.revenues.map((r) => (r.startMonth ? r : { ...r, startMonth: startFor(r.entityId) })),
		subscriptions: snapshot.subscriptions.map((s) => {
			if (s.startMonth) return s;
			const startMonth =
				s.cycle === "one_time" && YEAR_MONTH.test(s.nextRenewalDate)
					? s.nextRenewalDate.slice(0, 7)
					: startFor(s.entityId);
			return { ...s, startMonth };
		}),
		...(snapshot.liabilities
			? {
					liabilities: snapshot.liabilities.map((l) =>
						l.startMonth ? l : { ...l, startMonth: startFor(l.entityId) },
					),
				}
			: {}),
	};
}
