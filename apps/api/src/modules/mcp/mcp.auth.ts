import { mcpAdvertisedOrigin } from "../../lib/oauth";
import type { RateLimitSnapshot } from "../../lib/principal";

/**
 * The HTTP shapes `/mcp` answers with. Principal resolution moved to
 * `lib/principal.ts` when REST started accepting keys (#193); these builders
 * stay here because REST reuses the MCP bodies verbatim — one vocabulary on
 * both transports — and because they are the only part that knows the MCP
 * wire conventions (RFC 9728 challenge, lowercase `unauthorized`).
 */

export function rateLimitHeaders(snapshot: RateLimitSnapshot): Record<string, string> {
	return {
		"x-ratelimit-limit": String(snapshot.limit),
		"x-ratelimit-remaining": String(snapshot.remaining),
		"x-ratelimit-reset": String(snapshot.reset),
	};
}

/**
 * 401 in the shape the MCP Streamable HTTP spec expects, pointing at the
 * resource metadata.
 *
 * The body also names the API-key alternative (#123 A.1): a client that stops
 * at the 401 otherwise never learns `elk_` keys exist, even though both header
 * transports accept them. A fresh key was proven to answer 200 on prelive, so
 * the hint is accurate. "Scoped Keys" is the name of the minting surface in
 * both iam deployments (#91); it is not called "API keys" any more.
 *
 * It also spells out the resource-metadata URL for the host that was called
 * (#126): telling a person on curl to "read the WWW-Authenticate header" is one
 * hop less useful than the URL itself, and the URL is host-derived, so prelive
 * and production each advertise their own.
 *
 * `code` is the machine-readable half (#140/#141): a client can branch on
 * "UNAUTHORIZED" without parsing the sentence, and the same field carries
 * "RATE_LIMITED" on the 429.
 *
 * The body must stay identical for "no credentials" and "wrong key": nothing
 * derived from the presented credential may reach it, or it becomes an oracle.
 */
export function unauthorizedResponse(requestUrl: string): Response {
	const origin = mcpAdvertisedOrigin(requestUrl);
	const resourceMetadata = `${origin}/.well-known/oauth-protected-resource`;
	return new Response(
		JSON.stringify({
			error: "unauthorized",
			code: "UNAUTHORIZED",
			message: "This endpoint needs credentials.",
			hint: `Send an API key as \`Authorization: Bearer elk_…\` or \`x-api-key: elk_…\` (mint one under Scoped Keys), or connect with browser sign-in by following ${resourceMetadata}.`,
		}),
		{
			status: 401,
			headers: {
				"content-type": "application/json",
				"www-authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
			},
		},
	);
}

/**
 * 429 for a key that is valid but out of budget (#140).
 *
 * Deliberately no `WWW-Authenticate`: this is not a credential failure, and a
 * challenge here would send an agent back down the sign-in path. The body
 * repeats the Retry-After number because a model that only reads the JSON
 * would otherwise invent one.
 */
export function rateLimitedResponse(snapshot: RateLimitSnapshot, retryAfter?: number): Response {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		...rateLimitHeaders(snapshot),
	};
	if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
	return new Response(
		JSON.stringify({
			error: "rate_limited",
			code: "RATE_LIMITED",
			message: "This API key is over its request budget.",
			hint:
				retryAfter !== undefined
					? `The key allows ${snapshot.limit} requests per window. Wait ${retryAfter} seconds (or until X-RateLimit-Reset) and retry — the key is valid, so do not rotate it.`
					: `The key allows ${snapshot.limit} requests per window and has none left. The key is valid, so do not rotate it.`,
			retryAfter: retryAfter ?? null,
			rateLimit: snapshot,
		}),
		{ status: 429, headers },
	);
}
