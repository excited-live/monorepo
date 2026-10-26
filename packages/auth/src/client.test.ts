import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AUTH_REQUEST_TIMEOUT_MS, createAuthClient, isTimeoutError } from "./client"

/**
 * A redacted transport stand-in: records the request and never answers. The
 * auth client has no retry policy of its own, so exactly one call is expected.
 */
interface FetchCall {
	url: string
	method: string
	init: RequestInit | undefined
}

function hangUntilAborted(init: RequestInit | undefined): Promise<Response> {
	return new Promise<Response>((_resolve, reject) => {
		const signal = init?.signal
		if (!signal) return
		const fail = () => reject(signal.reason)
		if (signal.aborted) fail()
		else signal.addEventListener("abort", fail, { once: true })
	})
}

function stubHangingFetch(): { calls: FetchCall[]; fetchMock: ReturnType<typeof vi.fn> } {
	const calls: FetchCall[] = []
	const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: String(input),
			method: (init?.method ?? "GET").toUpperCase(),
			init,
		})
		return hangUntilAborted(init)
	})
	vi.stubGlobal("fetch", fetchMock)
	return { calls, fetchMock }
}

async function settle<T>(
	request: Promise<T>,
	advanceMs: number,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
	const outcome = request.then(
		(value) => ({ ok: true as const, value }),
		(error: unknown) => ({ ok: false as const, error }),
	)
	await vi.advanceTimersByTimeAsync(advanceMs)
	return outcome
}

beforeEach(() => {
	vi.useFakeTimers({ now: 1_000 })
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	vi.useRealTimers()
})

describe("bounded Better Auth client", () => {
	it("aborts a hanging sign-in POST at the 6 s deadline, without retrying", async () => {
		const { calls, fetchMock } = stubHangingFetch()
		const client = createAuthClient({ baseURL: "https://auth.excited.live" })

		const request = client.signIn.email({ email: "prame@example.com", password: "hunter2hunter2" })
		const outcome = request.then(
			(value) => ({ ok: true as const, value }),
			(error: unknown) => ({ ok: false as const, error }),
		)

		await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS - 1)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.signal?.aborted).toBe(false)

		await vi.advanceTimersByTimeAsync(1)
		const result = await outcome

		expect(result.ok).toBe(false)
		expect(result.ok === false && isTimeoutError(result.error)).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.method).toBe("POST")
		expect(calls[0]?.url).toContain("/sign-in/email")
	})

	it("bounds create-account the same way, one POST and no retry", async () => {
		const { calls, fetchMock } = stubHangingFetch()
		const client = createAuthClient({ baseURL: "https://auth.excited.live" })

		const result = await settle(
			client.signUp.email({
				name: "Prame",
				email: "prame@example.com",
				password: "hunter2hunter2",
			}),
			AUTH_REQUEST_TIMEOUT_MS,
		)

		expect(result.ok).toBe(false)
		expect(result.ok === false && isTimeoutError(result.error)).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.method).toBe("POST")
		expect(calls[0]?.url).toContain("/sign-up/email")
	})

	it("bounds the Google social POST too", async () => {
		const { calls, fetchMock } = stubHangingFetch()
		const client = createAuthClient({ baseURL: "https://auth.excited.live" })

		const result = await settle(
			client.signIn.social({ provider: "google", callbackURL: "/" }),
			AUTH_REQUEST_TIMEOUT_MS,
		)

		expect(result.ok).toBe(false)
		expect(result.ok === false && isTimeoutError(result.error)).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.method).toBe("POST")
		expect(calls[0]?.url).toContain("/sign-in/social")
	})

	it("bounds the first authenticated bootstrap read (get-session)", async () => {
		const { calls, fetchMock } = stubHangingFetch()
		const client = createAuthClient({ baseURL: "https://auth.excited.live" })

		const result = await settle(client.getSession(), AUTH_REQUEST_TIMEOUT_MS)

		expect(result.ok).toBe(false)
		expect(result.ok === false && isTimeoutError(result.error)).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.method).toBe("GET")
		expect(calls[0]?.url).toContain("/get-session")
	})

	it("keeps caller fetch options (credentials, base path) intact", async () => {
		const { calls, fetchMock } = stubHangingFetch()
		const client = createAuthClient({
			baseURL: "https://auth.excited.live",
			fetchOptions: { credentials: "include" },
		})

		void client.getSession().catch(() => {})

		await vi.advanceTimersByTimeAsync(10)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(calls[0]?.init?.credentials).toBe("include")
	})
})
