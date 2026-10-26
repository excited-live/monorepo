import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	ApiError,
	MAX_READ_ATTEMPTS,
	READ_TIMEOUT_MS,
	RETRY_DELAYS_MS,
	apiFetch,
} from "./api-client"

interface FetchCall {
	url: string
	init: RequestInit | undefined
	/** Fake-clock timestamp so we can assert the backoff really elapsed. */
	at: number
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	})
}

/** A request that never answers on its own; it only fails when aborted. */
function hangUntilAborted(init: RequestInit | undefined): Promise<Response> {
	return new Promise<Response>((_resolve, reject) => {
		const signal = init?.signal
		if (!signal) return
		const fail = () => reject(signal.reason)
		if (signal.aborted) fail()
		else signal.addEventListener("abort", fail, { once: true })
	})
}

function record(calls: FetchCall[]) {
	return (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ url: String(input), init, at: Date.now() })
	}
}

/** Attach handlers, then run the fake clock far past every timeout. */
async function settle<T>(
	promise: Promise<T>,
	advanceMs = 60_000,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
	const outcome = promise.then(
		(value) => ({ ok: true as const, value }),
		(error: unknown) => ({ ok: false as const, error }),
	)
	await vi.advanceTimersByTimeAsync(advanceMs)
	return outcome
}

beforeEach(() => {
	vi.useFakeTimers({ now: 1_000 })
	// Pin the jitter so the expected delays are exact.
	vi.spyOn(Math, "random").mockReturnValue(0)
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	vi.useRealTimers()
})

describe("apiFetch reads (GET/HEAD)", () => {
	it("times out a hanging GET, retries it, and returns the later success", async () => {
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			if (calls.length === 1) return hangUntilAborted(init)
			return Promise.resolve(jsonResponse({ plan: "ok" }))
		})
		vi.stubGlobal("fetch", fetchMock)

		const request = apiFetch<{ plan: string }>("/plan")

		// 6 s deadline expires, but the first retry must not fire before its 150 ms backoff.
		await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + RETRY_DELAYS_MS[0]! - 1)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal)

		await vi.advanceTimersByTimeAsync(1)
		await expect(request).resolves.toEqual({ plan: "ok" })
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(calls[1]!.at - calls[0]!.at).toBe(READ_TIMEOUT_MS + RETRY_DELAYS_MS[0]!)
	})

	it("retries a dropped connection (network TypeError) and then succeeds", async () => {
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			if (calls.length === 1) return Promise.reject(new TypeError("fetch failed"))
			return Promise.resolve(jsonResponse({ settings: true }))
		})
		vi.stubGlobal("fetch", fetchMock)

		const outcome = await settle(apiFetch<{ settings: boolean }>("/settings"))

		expect(outcome).toEqual({ ok: true, value: { settings: true } })
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it("does not retry a caller-initiated abort", async () => {
		const controller = new AbortController()
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			return hangUntilAborted(init)
		})
		vi.stubGlobal("fetch", fetchMock)

		const request = apiFetch("/plan", { signal: controller.signal })
		await vi.advanceTimersByTimeAsync(1_000)
		controller.abort(new Error("navigated away"))

		await expect(request).rejects.toThrow("navigated away")
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})

describe("apiFetch status handling", () => {
	it("does not retry a 400", async () => {
		const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ error: "bad request" }, 400)))
		vi.stubGlobal("fetch", fetchMock)

		const request = apiFetch("/settings")

		await expect(request).rejects.toBeInstanceOf(ApiError)
		await expect(request).rejects.toMatchObject({ status: 400 })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("retries a 500 exactly once, then surfaces the server error", async () => {
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			return Promise.resolve(jsonResponse({ error: "upstream" }, 500))
		})
		vi.stubGlobal("fetch", fetchMock)

		const outcome = await settle(apiFetch("/plan"))

		expect(outcome.ok).toBe(false)
		expect(outcome.ok === false && outcome.error).toBeInstanceOf(ApiError)
		expect(outcome.ok === false && (outcome.error as ApiError).status).toBe(500)
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(calls[1]!.at - calls[0]!.at).toBe(RETRY_DELAYS_MS[0]!)
	})
})

describe("apiFetch mutations (POST/PUT/PATCH/DELETE)", () => {
	it("does not retry a hanging POST and gives it no deadline of its own", async () => {
		const controller = new AbortController()
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			return hangUntilAborted(init)
		})
		vi.stubGlobal("fetch", fetchMock)

		const request = apiFetch("/plan", {
			method: "POST",
			body: JSON.stringify({ amount: 1 }),
			signal: controller.signal,
		})

		// Well past a read deadline: the POST must still be waiting, not retried
		// and not aborted by any client-side timeout.
		await vi.advanceTimersByTimeAsync(30_000)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.method).toBe("POST")
		expect(calls[0]?.init?.signal?.aborted).toBe(false)

		controller.abort(new Error("caller gave up"))
		await expect(request).rejects.toThrow("caller gave up")
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("does not retry a 500 on a mutation", async () => {
		const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ error: "upstream" }, 500)))
		vi.stubGlobal("fetch", fetchMock)

		const request = apiFetch("/plan", { method: "PUT", body: "{}" })

		await expect(request).rejects.toMatchObject({ status: 500 })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})

describe("apiFetch retry budget", () => {
	it("bounds the total attempts and rethrows the last timeout error", async () => {
		const calls: FetchCall[] = []
		const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			record(calls)(input, init)
			return hangUntilAborted(init)
		})
		vi.stubGlobal("fetch", fetchMock)

		const outcome = await settle(apiFetch("/plan"))

		expect(outcome.ok).toBe(false)
		expect(outcome.ok === false && (outcome.error as Error).name).toBe("TimeoutError")
		expect(fetchMock).toHaveBeenCalledTimes(MAX_READ_ATTEMPTS)
		expect(MAX_READ_ATTEMPTS).toBe(3)

		// Backoff really elapsed between attempts, and the added worst case is < 2 s.
		const [first, second, third] = calls.map((call) => call.at)
		expect(second! - first!).toBe(READ_TIMEOUT_MS + RETRY_DELAYS_MS[0]!)
		expect(third! - second!).toBe(READ_TIMEOUT_MS + RETRY_DELAYS_MS[1]!)
		expect(third! - first! - MAX_READ_ATTEMPTS * READ_TIMEOUT_MS).toBeLessThan(2_000)
	})
})
