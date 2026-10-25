// Tests for the Pages domain recovery policy used by
// .github/workflows/webapp-production.yml. Run with:
//   node --test scripts/pages-domain-recovery.test.mjs
// (wired into .gitea/workflows/ci.yml and .github/workflows/pr-tests.yml).
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath, URL } from "node:url"
import test from "node:test"
import { decideDomainRecovery } from "./pages-domain-recovery.mjs"

const script = fileURLToPath(new URL("./pages-domain-recovery.mjs", import.meta.url))
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" })

test("an active domain needs no recovery", () => {
	assert.deepEqual(decideDomainRecovery({ attachedThisRun: false, status: "active" }).action, "none")
	assert.deepEqual(decideDomainRecovery({ attachedThisRun: true, status: "Active" }).action, "none")
})

test("a domain this run attached may be re-added", () => {
	for (const status of ["pending", "initializing", "moved", ""]) {
		const decision = decideDomainRecovery({ attachedThisRun: true, status })
		assert.equal(decision.action, "readd", `status ${JSON.stringify(status)}`)
	}
})

test("a pre-existing domain is never detached by a routine deploy", () => {
	for (const status of ["pending", "initializing", "moved", "", null, undefined]) {
		const decision = decideDomainRecovery({ attachedThisRun: false, status })
		assert.equal(decision.action, "fail", `status ${JSON.stringify(status)}`)
		assert.match(decision.reason, /already attached/)
	}
})

test("a second re-add is never attempted: only the initial attach qualifies", () => {
	// After a failed re-add the workflow fails out; if it ever looped, the
	// domain is still "not attached by this run" from the guard's point of
	// view only while the first attach failed — covered above.
	const decision = decideDomainRecovery({ attachedThisRun: true, status: "error" })
	assert.equal(decision.action, "readd")
})

test("CLI prints the action for the workflow", () => {
	const readd = run("--attached-this-run=true", "--status=pending")
	assert.equal(readd.status, 0)
	assert.equal(readd.stdout.trim(), "readd")

	const fail = run("--attached-this-run=false", "--status=pending")
	assert.equal(fail.status, 0)
	assert.equal(fail.stdout.trim(), "fail")

	const none = run("--attached-this-run=false", "--status=active")
	assert.equal(none.status, 0)
	assert.equal(none.stdout.trim(), "none")
})

test("CLI accepts 1/0 and an empty status", () => {
	assert.equal(run("--attached-this-run=1", "--status=").stdout.trim(), "readd")
	assert.equal(run("--attached-this-run=0").stdout.trim(), "fail")
})

test("CLI emits JSON on request", () => {
	const result = run("--attached-this-run=false", "--status=pending", "--json")
	assert.equal(result.status, 0)
	const decision = JSON.parse(result.stdout)
	assert.equal(decision.action, "fail")
	assert.match(decision.reason, /already attached/)
})

test("CLI rejects unusable arguments instead of guessing", () => {
	const missing = run("--status=pending")
	assert.equal(missing.status, 2)
	assert.match(missing.stderr, /--attached-this-run is required/)

	const badBool = run("--attached-this-run=maybe")
	assert.equal(badBool.status, 2)
	assert.match(badBool.stderr, /expects true\/false/)

	const unknown = run("--attached-this-run=true", "--force")
	assert.equal(unknown.status, 2)
	assert.match(unknown.stderr, /unknown argument/)
})
