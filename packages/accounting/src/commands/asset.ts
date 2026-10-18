import { isCashAsset } from "../math";
import type { AccountingSnapshot, Asset } from "../types";

export function addAsset(
	snapshot: AccountingSnapshot,
	input: Omit<Asset, "id"> & { id?: string },
): { snapshot: AccountingSnapshot; asset: Asset } {
	const newAsset: Asset = {
		...input,
		id: input.id ?? `hw_${Date.now()}`,
	};

	const updatedHardware = input.isDefault
		? snapshot.hardware.map((h) =>
				h.entityId === input.entityId && isCashAsset(h)
					? { ...h, isDefault: false }
					: h,
			)
		: snapshot.hardware;

	return {
		snapshot: {
			...snapshot,
			hardware: [...updatedHardware, newAsset],
		},
		asset: newAsset,
	};
}

export function updateAsset(
	snapshot: AccountingSnapshot,
	asset: Asset,
): AccountingSnapshot {
	const hardware = snapshot.hardware.map((h) => {
		if (h.id === asset.id) return asset;
		if (asset.isDefault && h.entityId === asset.entityId && isCashAsset(h)) {
			return { ...h, isDefault: false };
		}
		return h;
	});

	return {
		...snapshot,
		hardware,
	};
}

export function deleteAsset(
	snapshot: AccountingSnapshot,
	id: string,
): AccountingSnapshot {
	return {
		...snapshot,
		hardware: snapshot.hardware.filter((h) => h.id !== id),
	};
}
