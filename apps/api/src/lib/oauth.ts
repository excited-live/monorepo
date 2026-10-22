import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"
import { requestOrigin } from "./auth"

/**
 * OAuth 2.1 resource-server support for `/mcp` (workstream A2.3).
 *
 * The authorization server runs on the webapp mount (`/api/auth`), because it
 * owns the sign-in UI and browser cookies. The API is the protected resource:
 * it advertises itself through RFC 9728 metadata and accepts the AS's JWT
 * access tokens, enforcing signature (AS JWKS), issuer, audience and expiry.
 *
 * Configuration is env-only:
 *
 *   - `EXCITED_WEBAPP_URL` (API): the webapp origin; issuer = `<origin>/api/auth`.
 *   - `EXCITED_API_URL` (webapp): the API origin; the AS binds tokens to
 *     `<origin>/mcp` as the audience (RFC 8707 `resource`).
 *
 * Without `EXCITED_WEBAPP_URL` this module is inert and `/mcp` keeps its A1
 * behaviour (API keys + sessions + dev passthrough).
 */

/** The one protected resource this API exposes. */
export const MCP_RESOURCE_PATH = "/mcp"

/** OAuth scopes advertised for the MCP resource (the AS also advertises OIDC defaults). */
export const OAUTH_SCOPES_SUPPORTED = ["onboarding", "accounting:read", "accounting:write"] as const

/** Strip a trailing slash so URL joins stay predictable. */
function trimOrigin(url: string): string {
	return url.replace(/\/+$/, "")
}

/** The webapp origin that hosts the authorization server, if configured. */
export function oauthWebappOrigin(): string | undefined {
	const value = process.env.EXCITED_WEBAPP_URL
	return value ? trimOrigin(value) : undefined
}

/** OAuth is only enabled when the AS origin is configured (A1 fallback otherwise). */
export function oauthConfigured(): boolean {
	return Boolean(oauthWebappOrigin())
}

/** The AS issuer: Better Auth's default base path under the webapp origin. */
export function oauthIssuer(webappOrigin: string): string {
	return `${trimOrigin(webappOrigin)}/api/auth`
}

/** The audience/resource identifier of this API's MCP endpoint. */
export function mcpResource(requestUrl: string): string {
	return `${requestOrigin(requestUrl)}${MCP_RESOURCE_PATH}`
}

/**
 * RFC 9728 protected-resource metadata. Returned for both
 * `/.well-known/oauth-protected-resource` and its `/mcp` suffix.
 */
export interface ProtectedResourceMetadata {
	resource: string
	authorization_servers: string[]
	scopes_supported: readonly string[]
	bearer_methods_supported: readonly string[]
}

export function protectedResourceMetadata(requestUrl: string): ProtectedResourceMetadata | null {
	const webappOrigin = oauthWebappOrigin()
	if (!webappOrigin) return null
	return {
		resource: mcpResource(requestUrl),
		authorization_servers: [oauthIssuer(webappOrigin)],
		scopes_supported: OAUTH_SCOPES_SUPPORTED,
		bearer_methods_supported: ["header"],
	}
}

/**
 * Map the OAuth `scope` claim onto the internal tool scopes.
 *
 * `onboarding` is the consent-friendly umbrella ("set up my books") that grants
 * both read and write of onboarding state. Everything else is used verbatim.
 */
export function scopesFromOAuthClaim(scope: unknown): Set<string> {
	const scopes = new Set<string>()
	if (typeof scope !== "string") return scopes
	for (const value of scope.split(/\s+/).filter(Boolean)) {
		if (value === "onboarding") {
			scopes.add("onboarding:read")
			scopes.add("onboarding:write")
		} else if (value === "accounting:read" || value === "accounting:write") {
			scopes.add(value)
		}
	}
	return scopes
}

/** JWKS clients are cached per URL (jose caches keys inside each client). */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function jwksFor(url: string): ReturnType<typeof createRemoteJWKSet> {
	let cached = jwksCache.get(url)
	if (!cached) {
		cached = createRemoteJWKSet(new URL(url))
		jwksCache.set(url, cached)
	}
	return cached
}

export interface OAuthPrincipal {
	userId: string
	scopes: Set<string>
}

/** A JWT compact serialization has three dot-separated parts; session tokens have at most one. */
export function looksLikeJwt(token: string): boolean {
	return token.split(".").length === 3
}

/**
 * Verify an OAuth access token against the AS JWKS and the expected issuer and
 * audience. Returns null for anything that does not verify (expired, wrong
 * issuer, wrong audience, bad signature, no subject).
 */
export async function verifyOAuthAccessToken(
	requestUrl: string,
	token: string,
): Promise<OAuthPrincipal | null> {
	const webappOrigin = oauthWebappOrigin()
	if (!webappOrigin) return null
	try {
		const { payload } = await jwtVerify(token, jwksFor(`${oauthIssuer(webappOrigin)}/jwks`), {
			issuer: oauthIssuer(webappOrigin),
			audience: mcpResource(requestUrl),
		})
		return principalFromPayload(payload)
	} catch {
		return null
	}
}

function principalFromPayload(payload: JWTPayload): OAuthPrincipal | null {
	if (!payload.sub) return null
	return { userId: payload.sub, scopes: scopesFromOAuthClaim(payload.scope) }
}

/** Test hook: drop cached JWKS clients when env values change between cases. */
export function resetOAuthJwksCache(): void {
	jwksCache.clear()
}
