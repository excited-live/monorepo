/**
 * Browser Better Auth clients with a hard request deadline.
 *
 * A Better Auth POST that never answers on the wire (the 2026-10-26 edge
 * fault on auth.excited.live) used to leave the sign-in button spinning
 * forever: the client has no default timeout and must not retry a mutation.
 * Every request made through these clients is therefore raced against the
 * shared 6 s deadline (`@excited-live/http`), and the deadline abort surfaces
 * as a `TimeoutError` the page can turn into an explicit "try again" state.
 *
 * The bound covers both methods on purpose: the sign-in / sign-up POSTs and
 * the first authenticated bootstrap read (`get-session`), which is the request
 * that decides whether an already-signed-in user gets into the app.
 *
 * Covered apps: `apps/webapp` (sign-in, create-account, topbar sign-out) and
 * `apps/iam` (consent + device approval, `get-session`). Server-side auth
 * (`apps/api`, `apps/webapp` loaders) does not use this entry.
 *
 * Retries are left exactly as they were: none. Repeating a mutation can
 * duplicate a write, so the deadline aborts instead of trying again.
 */
import { createAuthClient as createBetterAuthClient } from "better-auth/client"
import { createAuthClient as createBetterAuthReactClient } from "better-auth/react"
import { REQUEST_TIMEOUT_MS, withDeadline, type FetchLike } from "@excited-live/http"

export { REQUEST_TIMEOUT_MS as AUTH_REQUEST_TIMEOUT_MS, isTimeoutError } from "@excited-live/http"

type AuthClientOptions = NonNullable<Parameters<typeof createBetterAuthClient>[0]>

/**
 * Give the client's transport a deadline without changing any other fetch
 * option (credentials, hooks, a caller-supplied custom fetch, ...).
 */
function boundedOptions<Options extends AuthClientOptions | undefined>(
	options: Options,
): Options {
	const fetchOptions = options?.fetchOptions
	const baseFetch: FetchLike =
		fetchOptions?.customFetchImpl ?? ((input, init) => fetch(input, init))

	return {
		...options,
		fetchOptions: {
			...fetchOptions,
			customFetchImpl: withDeadline(baseFetch, REQUEST_TIMEOUT_MS),
		},
	} as Options
}

/**
 * Drop-in replacement for `better-auth/client`'s `createAuthClient`.
 * `@excited-live/auth/client` is the only sanctioned entry, so no app can
 * accidentally build an unbounded client.
 */
export const createAuthClient = ((options?: AuthClientOptions) =>
	createBetterAuthClient(boundedOptions(options))) as unknown as typeof createBetterAuthClient

/** React variant (session hooks) with the same deadline. */
export const createReactAuthClient = ((options?: AuthClientOptions) =>
	createBetterAuthReactClient(boundedOptions(options))) as unknown as typeof createBetterAuthReactClient
