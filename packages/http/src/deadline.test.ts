import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	REQUEST_TIMEOUT_MS,
	RequestTimeoutError,
	isTimeoutError,
	startDeadline,
	withDeadline,
} from "./deadline"

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

function record(calls: { init: RequestInit | undefined; at: number }[]) {
	return (_input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ init, at: Date.now() })
		return hangUntilAborted(init)
	}
}

beforeEach(() => {
	vi.useFakeTimers({ now: 1_000 })
})

afterEach(() => {
	vi.restoreAllMocks()
	vi.useRealTimers()
})

describe("withDeadline", () => {
	it("aborts a hanging request at exactly the 6 s deadline, once", async () => {
		const calls: { init: RequestInit | undefined; at: number }[] = []
		const fetchMock = vi.fn(record(calls))
		const bounded = withDeadline(fetchMock)

		const request = bounded("https://auth.excited.live/api/auth/sign-in/email", {
			method: "POST",
		})
		const outcome = request.then(
			(value) => ({ ok: true as const, value }),
			(error: unknown) => ({ ok: false as const, error }),
		)

		// One millisecond before the budget: still waiting, not retried.
		await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.signal?.aborted).toBe(false)

		await vi.advanceTimersByTimeAsync(1)
		const result = await outcome

		expect(result.ok).toBe(false)
		expect(result.ok === false && result.error).toBeInstanceOf(RequestTimeoutError)
		expect(result.ok === false && isTimeoutError(result.error)).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.method).toBe("POST")
	})

	it("lets a caller signal win before the deadline, with the caller's reason", async () => {
		const controller = new AbortController()
		const fetchMock = vi.fn(record([]))
		const bounded = withDeadline(fetchMock)

		const request = bounded("/api/auth/get-session", { signal: controller.signal })
		const outcome = request.then(
			(value) => ({ ok: true as const, value }),
			(error: unknown) => ({ ok: false as const, error }),
		)

		await vi.advanceTimersByTimeAsync(500)
		controller.abort(new Error("navigated away"))

		const result = await outcome
		expect(result.ok).toBe(false)
		expect(result.ok === false && (result.error as Error).message).toBe("navigated away")
		expect(isTimeoutError(result.ok === false ? result.error : null)).toBe(false)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("clears the deadline timer as soon as the request settles", async () => {
		const fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })))
		const bounded = withDeadline(fetchMock)

		await bounded("/api/auth/get-session")
		expect(vi.getTimerCount()).toBe(0)
	})

	it("does not impose a deadline when the caller asks for none", () => {
		const deadline = startDeadline(undefined, null)
		expect(deadline.signal).toBeUndefined()
		expect(deadline.timedOut()).toBe(false)
		deadline.cleanup()
	})
})
