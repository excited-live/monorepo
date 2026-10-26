/**
 * Bounded request deadlines, shared by every client transport.
 *
 * A request that never answers on the wire does not settle on its own: the
 * browser keeps the spinner turning until the user gives up. Transport code
 * therefore races each request against a hard deadline and aborts the fetch
 * when it expires.
 *
 * Two entry points, one implementation:
 *   - `startDeadline` gives a single attempt its own signal (apps/webapp's
 *     api-client uses it per attempt so GET retries do not share a budget).
 *   - `withDeadline` wraps a fetch implementation for clients that cannot
 *     easily thread a signal through (the Better Auth client's
 *     `customFetchImpl`).
 *
 * A caller-supplied signal always keeps its meaning: it aborts the request
 * early, and a deadline abort reports a `RequestTimeoutError` instead.
 */

/** Default per-request budget for clients that do not pick their own. */
export const REQUEST_TIMEOUT_MS = 6_000

/** The deadline expired before the request answered. */
export class RequestTimeoutError extends Error {
	constructor(public readonly timeoutMs: number) {
		super(`Request timed out after ${timeoutMs} ms`)
		this.name = "TimeoutError"
	}
}

/**
 * True for anything this package aborted on timeout, including an error that
 * crossed a package boundary (the name check keeps `instanceof` from being the
 * only signal).
 */
export function isTimeoutError(error: unknown): boolean {
	if (error instanceof RequestTimeoutError) return true
	return error instanceof Error && error.name === "TimeoutError"
}

export interface Deadline {
	/** Signal handed to `fetch`; aborts on timeout or when the caller aborts. */
	signal?: AbortSignal
	/** True when this attempt was aborted by the deadline, not by the caller. */
	timedOut: () => boolean
	cleanup: () => void
}

const NO_DEADLINE: Deadline = {
	signal: undefined,
	timedOut: () => false,
	cleanup: () => {},
}

/**
 * Start a fresh abort controller per attempt. `timeoutMs === null` means the
 * request gets no deadline of its own; a caller-supplied signal still aborts it.
 */
export function startDeadline(
	init: Pick<RequestInit, "signal"> | undefined,
	timeoutMs: number | null,
): Deadline {
	const caller = init?.signal ?? undefined
	if (timeoutMs === null && caller === undefined) return NO_DEADLINE

	const controller = new AbortController()
	let timedOut = false
	const onCallerAbort = () => controller.abort(caller?.reason)

	const timer =
		timeoutMs === null
			? undefined
			: setTimeout(() => {
					timedOut = true
					controller.abort(new RequestTimeoutError(timeoutMs))
				}, timeoutMs)

	if (caller) {
		if (caller.aborted) controller.abort(caller.reason)
		else caller.addEventListener("abort", onCallerAbort, { once: true })
	}

	return {
		signal: controller.signal,
		timedOut: () => timedOut,
		cleanup: () => {
			if (timer !== undefined) clearTimeout(timer)
			if (caller) caller.removeEventListener("abort", onCallerAbort)
		},
	}
}

/** The slice of `fetch` the helpers need. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/**
 * Wrap a fetch implementation so every request carries a hard deadline.
 * The wrapper never retries: repeating a request is a policy decision that
 * belongs to the caller, and a mutation must never be repeated automatically.
 */
export function withDeadline(
	fetchImpl: FetchLike,
	timeoutMs: number = REQUEST_TIMEOUT_MS,
): FetchLike {
	return async (input, init) => {
		const deadline = startDeadline(init, timeoutMs)
		try {
			return await fetchImpl(input, { ...init, signal: deadline.signal })
		} finally {
			deadline.cleanup()
		}
	}
}
