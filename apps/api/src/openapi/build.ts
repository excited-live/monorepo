import { createApp } from "../app"
import type { SqlDriver } from "../db/types"

/**
 * Render the OpenAPI document by asking the app for it, exactly as a client
 * would. The database is never touched (`/openapi.json` sits before the db
 * middleware), so a stub driver is enough.
 */
export async function buildOpenApiDocument(): Promise<unknown> {
	const app = createApp({ db: {} as SqlDriver })
	const res = await app.request("/openapi.json")
	if (!res.ok) throw new Error(`GET /openapi.json -> ${res.status}`)
	return res.json()
}

export function serializeOpenApiDocument(document: unknown): string {
	return `${JSON.stringify(document, null, "\t")}\n`
}
