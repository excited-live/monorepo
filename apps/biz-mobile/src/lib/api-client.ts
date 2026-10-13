import type {
	CapitalTransfer,
	EntityAccount,
	HardwareAsset,
	RecurringSubscription,
	RevenueStream,
} from "@excited-live/biz";

export interface BizSnapshot {
	accounts: EntityAccount[];
	subscriptions: RecurringSubscription[];
	hardware: HardwareAsset[];
	revenues: RevenueStream[];
	transfers: CapitalTransfer[];
	updatedAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1/biz";

export const bizApi = {
	async getSnapshot(userId = "default"): Promise<BizSnapshot> {
		const res = await fetch(`${API_BASE}`, {
			headers: { "x-user-id": userId },
		});
		if (!res.ok) throw new Error(`Failed to fetch snapshot: ${res.statusText}`);
		return res.json();
	},

	async syncSnapshot(data: BizSnapshot, userId = "default"): Promise<void> {
		const res = await fetch(`${API_BASE}`, {
			method: "PUT",
			headers: {
				"content-type": "application/json",
				"x-user-id": userId,
			},
			body: JSON.stringify(data),
		});
		if (!res.ok) throw new Error(`Failed to sync snapshot: ${res.statusText}`);
	},

	async addAccount(account: EntityAccount, userId = "default"): Promise<EntityAccount> {
		const res = await fetch(`${API_BASE}/accounts`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-user-id": userId },
			body: JSON.stringify(account),
		});
		return res.json();
	},

	async addSubscription(sub: RecurringSubscription, userId = "default"): Promise<RecurringSubscription> {
		const res = await fetch(`${API_BASE}/subscriptions`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-user-id": userId },
			body: JSON.stringify(sub),
		});
		return res.json();
	},

	async addHardware(hw: HardwareAsset, userId = "default"): Promise<HardwareAsset> {
		const res = await fetch(`${API_BASE}/hardware`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-user-id": userId },
			body: JSON.stringify(hw),
		});
		return res.json();
	},

	async addRevenue(rev: RevenueStream, userId = "default"): Promise<RevenueStream> {
		const res = await fetch(`${API_BASE}/revenues`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-user-id": userId },
			body: JSON.stringify(rev),
		});
		return res.json();
	},

	async addTransfer(tx: CapitalTransfer, userId = "default"): Promise<CapitalTransfer> {
		const res = await fetch(`${API_BASE}/transfers`, {
			method: "POST",
			headers: { "content-type": "application/json", "x-user-id": userId },
			body: JSON.stringify(tx),
		});
		return res.json();
	},
};
