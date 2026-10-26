/**
 * Unified API Client with Mock vs Live dispatching.
 *
 * In "mock" mode (default for `pnpm dev` and PR preview-mock):
 *   - Calls return local/stubbed engine data without making external network calls.
 *
 * In "live" mode (`pnpm dev:api`, PR preview-live, and production `pnpm start`):
 *   - Requests hit the backend API (proxied via Vite during dev, direct in prod).
 *
 * Transport policy (2026-10-26, edge-hang hardening):
 *   - GET/HEAD carry a per-attempt deadline (READ_TIMEOUT_MS) so a request that
 *     never answers on the wire fails fast instead of waiting forever.
 *   - GET/HEAD failures that are safe to repeat (network error, abort, timeout,
 *     or a 5xx) are retried with jittered backoff, bounded by MAX_READ_ATTEMPTS.
 *   - POST/PUT/PATCH/DELETE are single-shot with no deadline of their own: a
 *     repeated mutation can duplicate a write, so they never retry.
 *   - 4xx is never retried.
 *   - The last failure is always rethrown, so callers still see the real error.
 *
 * Only `fetch` is used, so the module is SSR-safe (the same code runs in the
 * TanStack route handlers and the Pages Function).
 */

import { REQUEST_TIMEOUT_MS, startDeadline } from "@excited-live/http"

export type ApiMode = "mock" | "live"

/** Per-attempt deadline for GET/HEAD (one budget, shared with the auth client). */
export const READ_TIMEOUT_MS = REQUEST_TIMEOUT_MS
/** Backoff before retry N (index 0 = first retry), before jitter. */
export const RETRY_DELAYS_MS: readonly number[] = [150, 400]
/** Extra random delay (0..JITTER_MS) so dead clients do not retry in lockstep. */
export const JITTER_MS = 100
/** One initial attempt plus one per backoff step. */
export const MAX_READ_ATTEMPTS = RETRY_DELAYS_MS.length + 1

export function getApiMode(): ApiMode {
	return import.meta.env.VITE_API_MODE === "live" ? "live" : "mock"
}

export function isLiveApi(): boolean {
	return getApiMode() === "live"
}

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: unknown,
	) {
		super(message)
		this.name = "ApiError"
	}
}

/** GET/HEAD are the only methods this client may repeat. */
export function isReadMethod(method: string): boolean {
	const normalized = method.toUpperCase()
	return normalized === "GET" || normalized === "HEAD"
}

/**
 * A retry never fires sooner than its backoff step: jitter only ever adds.
 */
export function retryDelayMs(retryIndex: number): number {
	const last = RETRY_DELAYS_MS.length - 1
	const base = RETRY_DELAYS_MS[retryIndex] ?? RETRY_DELAYS_MS[last] ?? 400
	return base + Math.floor(Math.random() * JITTER_MS)
}

/**
 * A fetch that never answers is aborted by the shared deadline helper; the
 * per-attempt policy (which methods repeat, how often) stays here.
 */
function abortReason(signal: AbortSignal | undefined): Error {
	const reason: unknown = signal?.reason
	return reason instanceof Error
		? reason
		: new DOMException("The operation was aborted", "AbortError")
}

/** Promise-based sleep that gives up as soon as the caller aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(abortReason(signal))
			return
		}
		const onAbort = () => {
			clearTimeout(timer)
			reject(abortReason(signal))
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort)
			resolve()
		}, ms)
		signal?.addEventListener("abort", onAbort, { once: true })
	})
}

/**
 * A dropped connection surfaces as a TypeError (undici and browsers agree);
 * an aborted attempt surfaces as an abort. A caller-initiated abort is not ours
 * to retry.
 */
function isRetryableTransportError(
	error: unknown,
	timedOut: boolean,
	callerSignal?: AbortSignal,
): boolean {
	if (timedOut) return true
	if (callerSignal?.aborted) return false
	if (error instanceof Error && error.name === "AbortError") return true
	return error instanceof TypeError
}

type AttemptOutcome<T> =
	| { kind: "success"; value: T }
	| { kind: "http"; error: ApiError }
	| { kind: "transport"; error: unknown; timedOut: boolean }

/** One request attempt with its own deadline; never retries by itself. */
async function attemptRequest<T>(
	url: string,
	init: RequestInit | undefined,
	method: string,
	headers: HeadersInit,
	timeoutMs: number | null,
): Promise<AttemptOutcome<T>> {
	const deadline = startDeadline(init, timeoutMs)
	try {
		const response = await fetch(url, {
			...init,
			method,
			headers,
			signal: deadline.signal,
		})

		if (!response.ok) {
			let errorData: unknown = null
			try {
				errorData = await response.json()
			} catch {
				// Response was not JSON
			}
			return {
				kind: "http",
				error: new ApiError(
					response.status,
					`API request failed: ${response.status} ${response.statusText}`,
					errorData,
				),
			}
		}

		return { kind: "success", value: (await response.json()) as T }
	} catch (error) {
		return { kind: "transport", error, timedOut: deadline.timedOut() }
	} finally {
		deadline.cleanup()
	}
}

/**
 * Base fetch wrapper for backend endpoints (/api/v1/*).
 */
export async function apiFetch<T>(
	endpoint: string,
	init?: RequestInit,
): Promise<T> {
	const url = endpoint.startsWith("/") ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`
	const method = (init?.method ?? "GET").toUpperCase()
	const repeatable = isReadMethod(method)
	const callerSignal = init?.signal ?? undefined
	const headers = {
		"Content-Type": "application/json",
		Accept: "application/json",
		...init?.headers,
	}

	let attempts = 0
	let statusRetried = false

	for (;;) {
		attempts += 1
		const outcome = await attemptRequest<T>(
			url,
			init,
			method,
			headers,
			repeatable ? READ_TIMEOUT_MS : null,
		)

		if (outcome.kind === "success") return outcome.value

		if (outcome.kind === "http") {
			// 5xx on a read may be a transient edge failure: retry exactly once.
			if (
				repeatable &&
				outcome.error.status >= 500 &&
				!statusRetried &&
				attempts < MAX_READ_ATTEMPTS
			) {
				statusRetried = true
				await sleep(retryDelayMs(attempts - 1), callerSignal)
				continue
			}
			throw outcome.error
		}

		// Transport failure, abort or timeout on a read: bounded retry.
		if (
			repeatable &&
			attempts < MAX_READ_ATTEMPTS &&
			isRetryableTransportError(outcome.error, outcome.timedOut, callerSignal)
		) {
			await sleep(retryDelayMs(attempts - 1), callerSignal)
			continue
		}

		throw outcome.error
	}
}
