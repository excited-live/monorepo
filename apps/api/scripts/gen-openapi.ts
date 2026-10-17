/**
 * Writes openapi.json from the live route annotations.
 *
 * The committed file is what the docs site reads (apps/landingpage runs
 * `gen:api-docs` against it), so the docs build never needs the API runtime.
 *
 * Run: pnpm --filter @excited-live/api gen:openapi
 * Drift is enforced in CI by src/openapi/openapi.parity.test.ts.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildOpenApiDocument, serializeOpenApiDocument } from "../src/openapi/build"

const outputFile = join(dirname(fileURLToPath(import.meta.url)), "..", "openapi.json")

writeFileSync(outputFile, serializeOpenApiDocument(await buildOpenApiDocument()))
console.log(`Wrote ${outputFile}`)
