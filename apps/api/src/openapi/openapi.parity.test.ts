import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { buildOpenApiDocument, serializeOpenApiDocument } from "./build"

const committed = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "openapi.json"), "utf8")

describe("openapi.json", () => {
	it("matches the route annotations (run `pnpm --filter @excited-live/api gen:openapi`)", async () => {
		expect(serializeOpenApiDocument(await buildOpenApiDocument())).toBe(committed)
	})

	it("documents every route the app serves", async () => {
		const doc = (await buildOpenApiDocument()) as { paths: Record<string, Record<string, unknown>> }
		const operations = Object.entries(doc.paths).flatMap(([path, methods]) =>
			Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
		)
		const expected = [
			"GET /api/v1/accounting/entities",
			"GET /api/v1/accounting/entities/{id}",
			"POST /api/v1/accounting/entities",
			"PATCH /api/v1/accounting/entities/{id}",
			"DELETE /api/v1/accounting/entities/{id}",
			"GET /api/v1/accounting/assets",
			"GET /api/v1/accounting/assets/{id}",
			"POST /api/v1/accounting/assets",
			"PATCH /api/v1/accounting/assets/{id}",
			"DELETE /api/v1/accounting/assets/{id}",
			"GET /api/v1/accounting/incomes",
			"GET /api/v1/accounting/incomes/{id}",
			"POST /api/v1/accounting/incomes",
			"PATCH /api/v1/accounting/incomes/{id}",
			"DELETE /api/v1/accounting/incomes/{id}",
			"POST /api/v1/accounting/incomes/career",
			"GET /api/v1/accounting/expenses",
			"GET /api/v1/accounting/expenses/{id}",
			"POST /api/v1/accounting/expenses",
			"PATCH /api/v1/accounting/expenses/{id}",
			"DELETE /api/v1/accounting/expenses/{id}",
			"GET /api/v1/accounting/liabilities",
			"GET /api/v1/accounting/liabilities/{id}",
			"POST /api/v1/accounting/liabilities",
			"PATCH /api/v1/accounting/liabilities/{id}",
			"DELETE /api/v1/accounting/liabilities/{id}",
			"GET /api/v1/accounting/transfers",
			"GET /api/v1/accounting/transfers/{id}",
			"POST /api/v1/accounting/transfers",
			"PATCH /api/v1/accounting/transfers/{id}",
			"DELETE /api/v1/accounting/transfers/{id}",
			"GET /api/v1/accounting/summary",
			"GET /api/v1/accounting/ledger/{yearMonth}",
			"GET /api/v1/accounting/projection",
		]
		for (const operation of expected) expect(operations).toContain(operation)
		expect(operations.filter((operation) => operation.includes("/api/v1/accounting/"))).toHaveLength(expected.length)
	})
})
