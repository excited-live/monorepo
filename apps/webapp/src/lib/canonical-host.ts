/**
 * One origin, one cookie jar (#54 task 1).
 *
 * `app.excited.live` is a Pages custom domain of the same deployment as
 * `auth.excited.live`, but Better Auth keys its state by host:
 *
 * - the session cookie is host-only, so a session created on `app.` is absent
 *   from `auth.` and the OAuth authorize step on the issuer bounces the user
 *   back to sign-in;
 * - `signIn.social` writes the OAuth `state` cookie on the origin that started
 *   the flow while the provider callback is built from `BETTER_AUTH_URL`
 *   (auth.), so a flow started on `app.` comes back with a state mismatch.
 *
 * The hostname has to stay attached to this project (that is how it left the
 * WorkOS tenant), so it is the *request* that moves: every path and query on
 * the alias answers 308 to the canonical origin. 308 — not 301/302 — keeps the
 * method and the body, so a sign-in or OAuth POST that still targets the alias
 * completes on the canonical origin instead of being demoted to GET.
 */

/** The canonical webapp origin: the OAuth issuer every client discovers. */
export const CANONICAL_WEBAPP_ORIGIN = "https://auth.excited.live"

/** Hosts that must never serve the app themselves, only redirect to it. */
export const ALIAS_WEBAPP_HOSTS: ReadonlySet<string> = new Set(["app.excited.live"])

/**
 * 308 to the canonical origin when `request` arrived on an alias host,
 * `null` when the request is already on the canonical origin (or on the
 * pages.dev origin, which stays a working deployment alias).
 */
export function canonicalHostRedirect(
	request: Request,
	options: { canonicalOrigin?: string; aliasHosts?: ReadonlySet<string> } = {},
): Response | null {
	const canonicalOrigin = (options.canonicalOrigin ?? CANONICAL_WEBAPP_ORIGIN).replace(/\/+$/, "")
	const aliasHosts = options.aliasHosts ?? ALIAS_WEBAPP_HOSTS

	const url = new URL(request.url)
	if (!aliasHosts.has(url.hostname)) return null

	// String concatenation, not `new URL(path, origin)`: a pathname starting
	// with `//` would otherwise be read as a protocol-relative host.
	return new Response(null, {
		status: 308,
		headers: {
			location: `${canonicalOrigin}${url.pathname}${url.search}`,
			"cache-control": "no-store",
		},
	})
}
