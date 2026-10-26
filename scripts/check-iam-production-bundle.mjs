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
 * and fails unless the guard rejects that copy, then copies it again without
 * index.html and fails unless the completeness check catches that too. The
 * real `dist/` is untouched.
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
import { join, relative, resolve } from "node:path"

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

/**
 * Count every occurrence of `needle` across `files` and remember the first
 * offending file, so a failure can name it instead of only its total.
 */
function countHits(files, needle) {
	let total = 0
	let first
	for (const file of files) {
		const bytes = readFileSync(file)
		// Skip images/fonts/binaries; only text can carry an inlined origin.
		if (bytes.includes(0)) continue
		const hits = bytes.toString("utf8").split(needle).length - 1
		if (hits === 0) continue
		total += hits
		first ??= { file, hits }
	}
	return { total, first }
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

	// A dist can carry every REQUIRED origin in its JS chunk and still be
	// undeployable: the three required strings live in the asset chunk, so
	// without index.html or a readable assets/ the SPA 404s on every route.
	const indexHtml = join(dir, "index.html")
	if (!existsSync(indexHtml)) {
		fail("dist/index.html is missing; the SPA would 404 on every route")
	} else if (statSync(indexHtml).size === 0) {
		fail("dist/index.html is empty; the SPA would 404 on every route")
	}

	const assets = join(dir, "assets")
	if (!existsSync(assets) || !statSync(assets).isDirectory()) {
		fail("dist/assets is missing; the SPA would have no JavaScript to run")
	} else if (readdirSync(assets).length === 0) {
		fail("dist/assets is empty; the SPA would have no JavaScript to run")
	}

	for (const marker of REQUIRED) {
		if (countHits(files, marker).total === 0) {
			fail(`the bundle never mentions ${marker}`)
		}
	}

	if (!existsSync(join(dir, "_redirects"))) {
		fail("dist/_redirects is missing; deep links would 404 on refresh")
	}

	for (const marker of FORBIDDEN) {
		const { total, first } = countHits(files, marker)
		if (total !== 0) {
			const where = first ? ` in ${relative(dir, first.file)}` : ""
			fail(`${marker} appears ${total} time(s)${where}; zero allowed`)
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
		// The failure must name the offending file, not only the total.
		const namedFile = relative(planted, js)
		if (!plantedProblems.some((problem) => problem.includes(namedFile))) {
			console.error(
				`::error::self-test failed: the workers.dev problem never names ${namedFile}: ${plantedProblems.join("; ")}`,
			)
			process.exit(1)
		}
		console.log("Self-test passed: the guard rejects a planted workers.dev string.")
	} finally {
		rmSync(planted, { recursive: true, force: true })
	}

	const noIndex = mkdtempSync(join(tmpdir(), "iam-guard-"))
	try {
		cpSync(dir, noIndex, { recursive: true })
		rmSync(join(noIndex, "index.html"), { force: true })

		const noIndexProblems = check(noIndex, { quiet: true })
		if (!noIndexProblems.some((problem) => problem.startsWith("dist/index.html is missing"))) {
			console.error(
				`::error::self-test failed: a bundle without index.html was accepted: ${
					noIndexProblems.length === 0 ? "no problems reported" : noIndexProblems.join("; ")
				}`,
			)
			process.exit(1)
		}
		console.log("Self-test passed: the guard rejects a bundle without index.html.")
	} finally {
		rmSync(noIndex, { recursive: true, force: true })
	}
}
