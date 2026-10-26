#!/usr/bin/env node
/**
 * Guard for the production apps/iam bundle (#88).
 *
 * Vite inlines VITE_* at build time, so a missing or prelive value is invisible
 * in CI and fatal in the browser. This checks the built `dist/` directory, not
 * the source: required production origins present, `_redirects` shipped, and
 * zero hits for every prelive/production-forbidden marker.
 *
 * Used by two callers, so the rule lives in one place:
 *   - .github/workflows/iam-production.yml (GitHub Actions, the deploy gate)
 *   - .gitea/workflows/iam-production-guard.yml (Gitea, the PR proof)
 *
 * Usage:
 *   node scripts/check-iam-production-bundle.mjs [--dir apps/iam/dist] [--self-test]
 *
 * `--self-test` copies the bundle, plants a workers.dev string in a JS asset
 * and fails unless the guard rejects that copy. The real `dist/` is untouched.
 */
import {
	appendFileSync,
	cpSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const REQUIRED = [
	"https://api.excited.live",
	"https://auth.excited.live",
	"https://api.excited.live/mcp",
]

/**
 * #88 lists seven strings. Do not add the bare word `prelive` to this list:
 * apps/iam/src/lib/env.ts contains it as a hostname prefix.
 *
 * play.google.com stays forbidden only while the Play listing 404s; drop it
 * from this list when the listing ships.
 */
const FORBIDDEN = [
	"workers.dev",
	"prelive.excited.live",
	"mcp.excited.live",
	"ex_live_",
	"/api/v1/plan",
	"/api/v1/sim",
	"play.google.com",
]

function walk(dir) {
	const out = []
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry)
		const stat = statSync(path)
		if (stat.isDirectory()) out.push(...walk(path))
		else if (stat.isFile()) out.push(path)
	}
	return out
}

function countHits(files, needle) {
	let hits = 0
	for (const file of files) {
		const bytes = readFileSync(file)
		// Skip images/fonts/binaries; only text can carry an inlined origin.
		if (bytes.includes(0)) continue
		hits += bytes.toString("utf8").split(needle).length - 1
	}
	return hits
}

function check(dir, { quiet = false } = {}) {
	if (!existsSync(dir) || !statSync(dir).isDirectory()) {
		return [`${dir} is not a directory — build apps/iam first`]
	}

	const files = walk(dir)
	const problems = []
	const fail = (message) => {
		problems.push(message)
		if (!quiet) console.error(`::error::${message}`)
	}

	for (const marker of REQUIRED) {
		if (countHits(files, marker) === 0) {
			fail(`the bundle never mentions ${marker}`)
		}
	}

	if (!existsSync(join(dir, "_redirects"))) {
		fail("dist/_redirects is missing; deep links would 404 on refresh")
	}

	for (const marker of FORBIDDEN) {
		const hits = countHits(files, marker)
		if (hits !== 0) {
			fail(`${marker} appears ${hits} time(s); zero allowed`)
		} else if (!quiet) {
			console.log(`zero hits: ${marker}`)
		}
	}

	return problems
}

function arg(name) {
	const index = process.argv.indexOf(name)
	return index === -1 ? undefined : process.argv[index + 1]
}

const dir = resolve(arg("--dir") ?? "apps/iam/dist")
const selfTest = process.argv.includes("--self-test")

console.log(`== production bundle: ${dir} ==`)
const problems = check(dir)
if (problems.length > 0) {
	console.error(`::error::bundle guard failed with ${problems.length} problem(s); nothing was deployed`)
	process.exit(1)
}
console.log("Bundle is production-clean.")

if (selfTest) {
	const planted = mkdtempSync(join(tmpdir(), "iam-guard-"))
	try {
		cpSync(dir, planted, { recursive: true })
		const js = walk(planted).find((file) => file.endsWith(".js"))
		if (!js) {
			console.error("::error::self-test failed: no JS asset in the bundle to plant a string in")
			process.exit(1)
		}
		appendFileSync(js, '\n// guard self-test\nconst _planted = "https://planted.workers.dev";\n')

		const plantedProblems = check(planted, { quiet: true })
		if (plantedProblems.length === 0) {
			console.error("::error::self-test failed: a planted workers.dev string was accepted")
			process.exit(1)
		}
		if (!plantedProblems.some((problem) => problem.startsWith("workers.dev appears"))) {
			console.error(`::error::self-test failed for the wrong reason: ${plantedProblems.join("; ")}`)
			process.exit(1)
		}
		console.log("Self-test passed: the guard rejects a planted workers.dev string.")
	} finally {
		rmSync(planted, { recursive: true, force: true })
	}
}
