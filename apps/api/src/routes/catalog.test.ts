import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { createNodeSqliteDriver } from "../db/node-sqlite";

describe("api/v1/catalog", () => {
	let app: ReturnType<typeof createApp>;

	beforeAll(async () => {
		app = createApp({ db: await createNodeSqliteDriver(":memory:") });
	});

	it("returns suggestions and best match for opencode", async () => {
		const res = await app.request("/api/v1/catalog/suggest?q=opencode&currency=THB");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.bestMatch).toBeDefined();
		expect(data.bestMatch.name).toBe("Opencode Go");
		expect(data.bestMatch.amount).toBe(360);
		expect(data.bestMatch.category).toBe("dev_tool");
		expect(data.bestMatch.imageUrl).toBeDefined();
	});

	it("returns fallback favicon when domain is queried", async () => {
		const res = await app.request("/api/v1/catalog/suggest?q=mycustomtool.io");
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.fallbackFavicon).toContain("google.com/s2/favicons?domain=mycustomtool.io");
	});

	it("resolves autofill preserving user-touched fields", async () => {
		// User has already manually touched cycle (e.g. set to yearly) and amount (e.g. 500)
		const res = await app.request("/api/v1/catalog/resolve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query: "opencode",
				currency: "THB",
				touchedFields: {
					amount: true,
					cycle: true,
					imageUrl: false,
					category: false,
				},
				currentValues: {
					amount: 500,
					cycle: "yearly",
				},
			}),
		});

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.source).toBe("preset");
		// Amount and cycle should NOT be in autofill because user touched them!
		expect(data.autofill.amount).toBeUndefined();
		expect(data.autofill.cycle).toBeUndefined();
		// Image and category SHOULD be in autofill because untouched!
		expect(data.autofill.imageUrl).toBeDefined();
		expect(data.autofill.category).toBe("dev_tool");
	});
});
