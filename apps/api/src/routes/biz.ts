import { Hono } from "hono";
import {
	generateMonthlyLedger,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
} from "@excited-live/biz";
import type { ApiEnv } from "../lib/env";
import { getUserId } from "../lib/request";
import { createBizStore, type BizDataSnapshot } from "../stores/biz-store";

export function createBizRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	// Get full state snapshot
	router.get("/", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data);
	});

	// Sync / overwrite full state snapshot
	router.put("/", async (c) => {
		const store = createBizStore(c.get("db"));
		const body = await c.req.json<Omit<BizDataSnapshot, "updatedAt">>();
		await store.save(getUserId(c), body);
		return c.json({ ok: true, data: body });
	});

	// ACCOUNTS
	router.get("/accounts", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.accounts);
	});

	router.post("/accounts", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newAccount = await c.req.json<EntityAccount>();
		const updated = {
			...data,
			accounts: [...data.accounts, newAccount],
		};
		await store.save(userId, updated);
		return c.json(newAccount, 201);
	});

	router.put("/accounts/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const update = await c.req.json<Partial<EntityAccount>>();
		const accounts = data.accounts.map((a) => (a.id === id ? { ...a, ...update } : a));
		await store.save(userId, { ...data, accounts });
		return c.json({ ok: true });
	});

	router.delete("/accounts/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const accounts = data.accounts.filter((a) => a.id !== id);
		const subscriptions = data.subscriptions.filter((s) => s.entityId !== id);
		const hardware = data.hardware.filter((h) => h.entityId !== id);
		const revenues = data.revenues.filter((r) => r.entityId !== id);
		const liabilities = data.liabilities.filter((l) => l.entityId !== id);
		await store.save(userId, { ...data, accounts, subscriptions, hardware, revenues, liabilities });
		return c.json({ ok: true });
	});

	// SUBSCRIPTIONS
	router.get("/subscriptions", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.subscriptions);
	});

	router.post("/subscriptions", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newSub = await c.req.json<RecurringSubscription>();
		await store.save(userId, {
			...data,
			subscriptions: [...data.subscriptions, newSub],
		});
		return c.json(newSub, 201);
	});

	router.put("/subscriptions/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const update = await c.req.json<Partial<RecurringSubscription>>();
		const subscriptions = data.subscriptions.map((s) => (s.id === id ? { ...s, ...update } : s));
		await store.save(userId, { ...data, subscriptions });
		return c.json({ ok: true });
	});

	router.delete("/subscriptions/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const subscriptions = data.subscriptions.filter((s) => s.id !== id);
		await store.save(userId, { ...data, subscriptions });
		return c.json({ ok: true });
	});

	// HARDWARE
	router.get("/hardware", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.hardware);
	});

	router.post("/hardware", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newHw = await c.req.json<HardwareAsset>();
		await store.save(userId, {
			...data,
			hardware: [...data.hardware, newHw],
		});
		return c.json(newHw, 201);
	});

	router.put("/hardware/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const update = await c.req.json<Partial<HardwareAsset>>();
		const hardware = data.hardware.map((h) => (h.id === id ? { ...h, ...update } : h));
		await store.save(userId, { ...data, hardware });
		return c.json({ ok: true });
	});

	router.delete("/hardware/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const hardware = data.hardware.filter((h) => h.id !== id);
		await store.save(userId, { ...data, hardware });
		return c.json({ ok: true });
	});

	// REVENUES
	router.get("/revenues", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.revenues);
	});

	router.post("/revenues", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newRev = await c.req.json<RevenueStream>();
		await store.save(userId, {
			...data,
			revenues: [...data.revenues, newRev],
		});
		return c.json(newRev, 201);
	});

	router.put("/revenues/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const update = await c.req.json<Partial<RevenueStream>>();
		const revenues = data.revenues.map((r) => (r.id === id ? { ...r, ...update } : r));
		await store.save(userId, { ...data, revenues });
		return c.json({ ok: true });
	});

	router.delete("/revenues/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const revenues = data.revenues.filter((r) => r.id !== id);
		await store.save(userId, { ...data, revenues });
		return c.json({ ok: true });
	});

	// LIABILITIES
	router.get("/liabilities", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.liabilities);
	});

	router.post("/liabilities", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newLiab = await c.req.json<LiabilityStream>();
		await store.save(userId, {
			...data,
			liabilities: [...data.liabilities, newLiab],
		});
		return c.json(newLiab, 201);
	});

	router.put("/liabilities/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const update = await c.req.json<Partial<LiabilityStream>>();
		const liabilities = data.liabilities.map((l) => (l.id === id ? { ...l, ...update } : l));
		await store.save(userId, { ...data, liabilities });
		return c.json({ ok: true });
	});

	router.delete("/liabilities/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const liabilities = data.liabilities.filter((l) => l.id !== id);
		await store.save(userId, { ...data, liabilities });
		return c.json({ ok: true });
	});

	// TRANSFERS
	router.get("/transfers", async (c) => {
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));
		return c.json(data.transfers);
	});

	router.post("/transfers", async (c) => {
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const newTx = await c.req.json<CapitalTransfer>();
		await store.save(userId, {
			...data,
			transfers: [...data.transfers, newTx],
		});
		return c.json(newTx, 201);
	});

	router.delete("/transfers/:id", async (c) => {
		const id = c.req.param("id");
		const store = createBizStore(c.get("db"));
		const userId = getUserId(c);
		const data = await store.get(userId);
		const transfers = data.transfers.filter((t) => t.id !== id);
		await store.save(userId, { ...data, transfers });
		return c.json({ ok: true });
	});

	// COMPUTED MONTHLY LEDGER
	router.get("/ledger/:yearMonth", async (c) => {
		const yearMonth = c.req.param("yearMonth");
		const entityId = c.req.query("entityId");
		const store = createBizStore(c.get("db"));
		const data = await store.get(getUserId(c));

		const account = data.accounts.find((a) => a.id === entityId) || data.accounts[0];
		if (!account) {
			return c.json({ error: "No account found" }, 404);
		}

		const ledger = generateMonthlyLedger({
			account,
			yearMonth,
			subscriptions: data.subscriptions,
			hardware: data.hardware,
			revenues: data.revenues,
			transfers: data.transfers,
		});

		return c.json(ledger);
	});

	return router;
}
