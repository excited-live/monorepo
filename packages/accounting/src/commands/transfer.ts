import { isCashAsset } from "../math";
import type { AccountingSnapshot, Asset, Transfer } from "../types";

export function recordTransfer(
	snapshot: AccountingSnapshot,
	input: {
		fromEntityId: string;
		toEntityId: string;
		amount: number;
		date: string;
		note?: string;
		frequency?: "one_time" | "monthly";
		targetAssetId?: string;
		id?: string;
	},
): { snapshot: AccountingSnapshot; transfer: Transfer; createdAsset?: Asset } {
	const toCashAssets = snapshot.hardware.filter(
		(h) => h.entityId === input.toEntityId && isCashAsset(h),
	);
	let resolvedTargetAssetId = input.targetAssetId;
	let createdAsset: Asset | undefined;
	let updatedHardware = snapshot.hardware;

	if (
		resolvedTargetAssetId === "primary_cash" ||
		(!resolvedTargetAssetId && toCashAssets.length === 0)
	) {
		const existingPrimary = toCashAssets.find((h) => h.isDefault) || toCashAssets[0];
		if (existingPrimary) {
			resolvedTargetAssetId = existingPrimary.id;
		} else {
			const newAssetId = `hw_cash_${Date.now()}`;
			createdAsset = {
				id: newAssetId,
				entityId: input.toEntityId,
				name: "Primary Cash Account",
				cost: 0,
				lifespanMonths: 0,
				purchaseDate: input.date,
				category: "cash",
				isDefault: true,
			};
			updatedHardware = [...snapshot.hardware, createdAsset];
			resolvedTargetAssetId = newAssetId;
		}
	} else if (!resolvedTargetAssetId && toCashAssets.length > 0) {
		const defaultOrFirst = toCashAssets.find((h) => h.isDefault) || toCashAssets[0];
		resolvedTargetAssetId = defaultOrFirst?.id;
	}

	const newTx: Transfer = {
		id: input.id ?? `tx_${Date.now()}`,
		fromEntityId: input.fromEntityId,
		toEntityId: input.toEntityId,
		amount: input.amount,
		date: input.date,
		note: input.note || "Capital transfer",
		frequency: input.frequency || "one_time",
		...(resolvedTargetAssetId ? { targetAssetId: resolvedTargetAssetId } : {}),
	};

	return {
		snapshot: {
			...snapshot,
			hardware: updatedHardware,
			transfers: [newTx, ...snapshot.transfers],
		},
		transfer: newTx,
		createdAsset,
	};
}

export function updateTransfer(
	snapshot: AccountingSnapshot,
	transfer: Transfer,
): AccountingSnapshot {
	return {
		...snapshot,
		transfers: snapshot.transfers.map((t) =>
			t.id === transfer.id ? transfer : t,
		),
	};
}

export function deleteTransfer(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	return {
		...snapshot,
		transfers: snapshot.transfers.filter((t) => t.id !== id),
	};
}
