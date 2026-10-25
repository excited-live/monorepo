#!/usr/bin/env node
/**
 * Decide what to do when a Pages custom domain is attached to a project but has
 * not reached `active` after the validation window.
 *
 * Used by .github/workflows/webapp-production.yml ("Ensure webapp custom
 * domains and DNS"). Background (Ada, PR #50 review): the step used to DELETE
 * and re-POST any domain that was not `active` within three minutes. On a
 * routine deploy a transient status — certificate renewal, an edge hiccup —
 * would therefore detach the issuer's own hostname (auth.excited.live) and
 * break every connector until the re-attach finished.
 *
 * Only a hostname THIS run attached may be re-added: before this run it did not
 * belong to the project at all, so detaching it cannot break anything that was
 * already serving. A domain that was already on the project belongs to an
 * earlier deploy; leave it in place and fail loudly instead. "Fail loudly" is
 * the point: a silent success on a domain that is not active hides a broken
 * issuer.
 *
 * Usage:  node scripts/pages-domain-recovery.mjs --attached-this-run=<bool> --status=<status>
 * Prints: none | readd | fail
 * Exit:   0 for a decision, 2 for bad arguments.
 */

import { pathToFileURL } from "node:url"

const ACTIONS = ["none", "readd", "fail"]

/**
 * @param {{ attachedThisRun: boolean, status?: string | null }} input
 * @returns {{ action: "none" | "readd" | "fail", reason: string }}
 */
export function decideDomainRecovery({ attachedThisRun, status }) {
	const current = String(status ?? "").trim().toLowerCase()

	if (current === "active") {
		return { action: "none", reason: "domain is active; nothing to recover" }
	}
	if (attachedThisRun === true) {
		return {
			action: "readd",
			reason: `domain was attached by this run and is still ${current || "unknown"}; re-add so validation runs again`,
		}
	}
	return {
		action: "fail",
		reason:
			`domain was already attached to this project before this run and is still ${current || "unknown"}; ` +
			"leaving it in place — a routine deploy must not detach a pre-existing (possibly canonical) hostname",
	}
}

const BOOLEANS = {
	true: true,
	"1": true,
	yes: true,
	false: false,
	"0": false,
	no: false,
}

function parseArgs(argv) {
	const options = { attachedThisRun: undefined, status: "", json: false }

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (arg === "--json") {
			options.json = true
			continue
		}
		const [flag, inline] = arg.split("=", 2)
		const value = inline ?? argv[(index += 1)]
		if (flag === "--attached-this-run") {
			if (!(value in BOOLEANS)) throw new Error(`--attached-this-run expects true/false, got ${JSON.stringify(value)}`)
			options.attachedThisRun = BOOLEANS[value]
		} else if (flag === "--status") {
			options.status = value ?? ""
		} else {
			throw new Error(`unknown argument ${JSON.stringify(arg)}`)
		}
	}

	if (options.attachedThisRun === undefined) throw new Error("--attached-this-run is required")
	return options
}

function main(argv) {
	let options
	try {
		options = parseArgs(argv)
	} catch (error) {
		console.error(`${error.message}\nusage: node scripts/pages-domain-recovery.mjs --attached-this-run=<bool> [--status=<status>] [--json]`)
		return 2
	}

	const decision = decideDomainRecovery(options)
	if (!ACTIONS.includes(decision.action)) throw new Error(`unreachable action ${decision.action}`)
	process.stdout.write(options.json ? `${JSON.stringify(decision)}\n` : `${decision.action}\n`)
	return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exitCode = main(process.argv.slice(2))
}
