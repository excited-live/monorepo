// Auth hang probe (#158). Fires sign-ups and get-session against a running API
// (wrangler dev, or the prelive Worker) and counts requests that do not answer
// within the timeout. Exit 0 only when nothing hung.
//
//   pnpm exec tsx scripts/auth-hang-probe.ts [baseUrl] [--n=10] [--timeout=20] [--concurrent=5] [--no-prime]
//
// Before the probes it sends the anonymous 401s the deploy smoke test sends
// (GET /api/v1/settings, POST /mcp). That ordering is the repro: on a fresh
// isolate those requests used to build a cached Better Auth instance whose
// init() never settled, hanging every later sign-up/get-session. Local run:
//   pnpm --filter @excited-live/api build && cd apps/api &&
//   npx wrangler dev --env prelive --local   # with BETTER_AUTH_SECRET in .dev.vars
//   pnpm exec tsx scripts/auth-hang-probe.ts http://127.0.0.1:8787
export {}

const args = process.argv.slice(2)
const base = (args.find((a) => !a.startsWith("--")) ?? "http://127.0.0.1:8787").replace(/\/$/, "")
const opt = (name: string, fallback: number): number => {
	const hit = args.find((a) => a.startsWith(`--${name}=`))
	return hit ? Number(hit.split("=")[1]) : fallback
}
const n = opt("n", 10)
const timeoutMs = opt("timeout", 20) * 1000
const concurrent = opt("concurrent", 5)

interface Result {
	label: string
	ok: boolean
	status: number | string
	ms: number
}

async function timed(label: string, url: string, init?: RequestInit): Promise<Result> {
	const t0 = Date.now()
	try {
		const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
		await res.text()
		return { label, ok: res.status < 500, status: res.status, ms: Date.now() - t0 }
	} catch (error) {
		return { label, ok: false, status: (error as Error | undefined)?.name === "TimeoutError" ? "HANG" : "ERR", ms: Date.now() - t0 }
	}
}

const signUp = (tag: string) =>
	timed(`sign-up ${tag}`, `${base}/api/v1/auth/sign-up/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: base },
		body: JSON.stringify({
			name: "V",
			email: `verify+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
			password: "verify-pass-1234",
		}),
	})
const getSession = (tag: string) => timed(`get-session ${tag}`, `${base}/api/v1/auth/get-session`)

const results: Result[] = []
const log = (r: Result): void => {
	results.push(r)
	console.log(`${r.ok ? "ok  " : "FAIL"} ${r.label.padEnd(22)} ${String(r.status).padEnd(5)} ${r.ms}ms`)
}

if (!args.includes("--no-prime")) {
	const primes: [string, string, RequestInit][] = [
		["prime settings", "/api/v1/settings", {}],
		["prime mcp", "/mcp", { method: "POST" }],
	]
	for (const [label, path, init] of primes) {
		const t0 = Date.now()
		const res = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) }).catch(() => null)
		console.log(`${label.padEnd(15)} ${res?.status ?? "no answer"} ${Date.now() - t0}ms`)
	}
}
console.log(`# sequential x${n} against ${base} (timeout ${timeoutMs / 1000}s)`)
for (let i = 0; i < n; i++) {
	log(await signUp(`seq#${i}`))
	log(await getSession(`seq#${i}`))
}
console.log(`# concurrent x${concurrent}`)
for (const r of await Promise.all(
	Array.from({ length: concurrent }, (_, i) => (i % 2 ? getSession(`par#${i}`) : signUp(`par#${i}`))),
)) {
	log(r)
}
const bad = results.filter((r) => !r.ok)
console.log(`\n${results.length - bad.length}/${results.length} answered, ${bad.length} failed (${bad.filter((r) => r.status === "HANG").length} hung)`)
process.exit(bad.length ? 1 : 0)
