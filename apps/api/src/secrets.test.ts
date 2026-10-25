import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * Source-level guard against a committed signing secret.
 *
 * src/index.ts used to fill in a hardcoded BETTER_AUTH_SECRET when the env var
 * was missing, and that string was published in this repository (#140): any
 * process that forgot the env var signed sessions and OAuth grants with a
 * public value. The boot check is the fix; this test keeps a future refactor
 * from quietly reintroducing a literal.
 *
 * Test files are exempt from the literal-assignment rule because they need
 * fixture secrets, which is why they are filtered out below. The retired value
 * itself is banned everywhere, tests included.
 */
const srcDir = fileURLToPath(new URL("./", import.meta.url))

// Assembled from fragments so this guard file does not itself contain the
// literal it forbids.
const RETIRED_SECRET = ["excited-live", "dev-secret", "better-auth", "solopreneur-2026"].join("-")

/** Any quoted string of 8+ characters assigned to the secret, however it is spelled. */
const LITERAL_ASSIGNMENT = /BETTER_AUTH_SECRET["']?\s*[=:]\s*["'`]([^"'`\n]{8,})["'`]/g

function sourceFiles(dir: string): string[] {
	const found: string[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules") continue
		const path = join(dir, entry.name)
		if (entry.isDirectory()) found.push(...sourceFiles(path))
		else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) found.push(path)
	}
	return found
}

const files = sourceFiles(srcDir)
const isTestFile = (path: string) => /\.test\.tsx?$/.test(path)

describe("no committed auth secret", () => {
	it("scans the source tree it is meant to guard", () => {
		expect(files.length).toBeGreaterThan(0)
		expect(files).toContain(join(srcDir, "index.ts"))
	})

	it("never reintroduces the retired development secret", () => {
		const offenders = files
			.filter((path) => readFileSync(path, "utf8").includes(RETIRED_SECRET))
			.map((path) => relative(srcDir, path))
			.sort()

		expect(offenders).toEqual([])
	})

	it("never assigns a quoted literal to BETTER_AUTH_SECRET outside tests", () => {
		const offenders: string[] = []
		for (const path of files) {
			if (isTestFile(path)) continue
			const source = readFileSync(path, "utf8")
			for (const match of source.matchAll(LITERAL_ASSIGNMENT)) {
				const value = match[1] ?? ""
				if (!value) continue
				// Never echo the value itself: the point is that it should not exist.
				offenders.push(`${relative(srcDir, path)} (${value.length} chars)`)
			}
		}

		expect(offenders).toEqual([])
	})
})
