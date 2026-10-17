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
		for (const entity of ["accounts", "subscriptions", "hardware", "revenues", "liabilities", "transfers"]) {
			expect(operations).toContain(`GET /api/v1/biz/${entity}`)
			expect(operations).toContain(`POST /api/v1/biz/${entity}`)
			expect(operations).toContain(`DELETE /api/v1/biz/${entity}/{id}`)
		}
	})
})
