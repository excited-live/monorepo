import {
	betterAuth,
	type Auth as BetterAuthInstance,
	type BetterAuthOptions,
	type BetterAuthPlugin,
} from "better-auth"
import { bearer, deviceAuthorization, jwt } from "better-auth/plugins"
import { kyselyAdapter } from "@better-auth/kysely-adapter"
import { NodeSqliteDialect } from "@better-auth/kysely-adapter/node-sqlite-dialect"
import { apiKey } from "@better-auth/api-key"
import { oauthProvider } from "@better-auth/oauth-provider"
import { Kysely } from "kysely"
import { createD1SqliteDialect } from "./d1-sqlite-dialect"
import type { AuthDatabase, AuthMount } from "./types"

/**
 * The shared Better Auth instance factory.
 *
 * One schema, one secret, two mounts (see docs/plan-auth-migration.md):
 *
 *   - apps/webapp mounts with `cookies` — TanStack Start cookie sessions for
 *     the dashboard, BFF identity injection, and the sign-in UI.
 *   - apps/api mounts with `tokens` — bearer + API keys + OAuth provider for
 *     native apps and the future public API. No cookies cross that boundary.
 *
 * Both mounts open the same D1/SQLite database, so user and session rows are
 * shared and a token issued by one mount resolves in the other.
 *
 * `transaction: false` everywhere: D1 has no interactive transactions, and the
 * two mounts must run identical adapter config so both code paths stay
 * interchangeable.
 */

export interface AuthInput {
	database: AuthDatabase
	secret: string
	baseURL?: string
	/** Extra origins allowed cross-origin (mobile deep-link origins, webapp origin for the api mount). */
	trustedOrigins?: string[]
	mount: AuthMount
	/** Google social login (OQ-1: email/password + Google). Only wired when both env vars exist. */
	google?: { clientId: string; clientSecret: string }
	/** Page the OAuth provider sends users to for sign-in (api mount). Default: /sign-in on the webapp. */
	oauthLoginPage?: string
	/** Page the OAuth provider sends users to for consent (api mount). Default: /consent. */
	oauthConsentPage?: string
	/**
	 * Turn this instance into the MCP authorization server (A2.1).
	 *
	 * Only the webapp cookies mount passes this in production: it has the
	 * sign-in/consent/device pages and the browser cookies the OAuth flow
	 * needs. `baseURL` is then mandatory (the issuer is derived from it).
	 */
	oauth?: AuthOAuthInput
	/**
	 * Framework cookie integration for the `cookies` mount, injected by the
	 * caller: `apps/webapp` passes `tanstackStartCookies()` from
	 * `@excited-live/auth/tanstack-start`.
	 *
	 * It is injected rather than imported here because
	 * `better-auth/tanstack-start` pulls `@tanstack/react-start-server`, which
	 * needs TanStack Start's virtual modules (`#tanstack-start-entry`). Those
	 * only exist inside a Vite build, so a top-level import here made the
	 * `tokens` mount unbundleable for the Workers runtime (apps/api), where no
	 * framework runtime exists anyway. Always pushed LAST — see the ordering
	 * note in `createAuth`.
	 */
	cookiesPlugin?: BetterAuthPlugin
}

/** OAuth scopes every Better Auth AS advertises (OIDC defaults). */
export const OAUTH_DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"] as const

/**
 * Scopes the excited.live authorization server accepts beyond the defaults.
 * `openid` is what makes it an OIDC server; MCP only uses the three below.
 */
export const MCP_OAUTH_SCOPES = ["onboarding", "accounting:read", "accounting:write"] as const

/** The one public (no client secret) client the RFC 8628 device flow accepts. */
export const DEVICE_CLIENT_ID = "excited-live-agent"

export interface AuthOAuthInput {
	/** Protected resource the AS issues audience-bound JWTs for: the MCP endpoint URL. */
	resource: string
	/** Absolute verification URI the device flow sends users to (webapp `/device`). */
	deviceVerificationUri: string
	/** Public device-flow client id. Default: `excited-live-agent`. */
	deviceClientId?: string
	/** Extra scopes on top of `OAUTH_DEFAULT_SCOPES`. Defaults to `MCP_OAUTH_SCOPES`. */
	scopes?: readonly string[]
}

/**
 * The auth instance type, pinned to the core options instantiation.
 *
 * Plugin-added endpoints (apiKey, oauth) are exercised over HTTP by apps —
 * keeping the public type on the core instantiation avoids a declaration-emit
 * type that exceeds the compiler's serialization limit.
 */
export type Auth = BetterAuthInstance<BetterAuthOptions>

/**
 * The apiKey plugin endpoints the API calls in-process, typed against the
 * installed @better-auth/api-key 1.7.7 signatures.
 *
 * `Auth` is pinned to the core options instantiation (the plugin-instantiated
 * type exceeds TypeScript's declaration-emit limit, see
 * docs/plan-auth-migration.md), so this is the one explicit bridge to the
 * plugin surface. Runtime endpoints come from the plugin itself.
 */
export interface ApiKeyRecord {
	id: string
	name: string | null
	start: string | null
	referenceId: string
	permissions?: Record<string, string[]> | null
	metadata: Record<string, unknown> | null
	createdAt: Date
	expiresAt: Date | null
	lastRequest: Date | null
}

export interface ApiKeyApi {
	createApiKey(input: {
		body: {
			userId: string
			name?: string
			expiresIn?: number
			permissions?: Record<string, string[]>
			metadata?: Record<string, unknown>
		}
	}): Promise<ApiKeyRecord & { key: string }>
	verifyApiKey(input: { body: { key: string } }): Promise<{ valid: boolean; key: ApiKeyRecord | null }>
	listApiKeys(input: { headers: Headers }): Promise<{ apiKeys: ApiKeyRecord[]; total: number }>
	deleteApiKey(input: { body: { keyId: string }; headers: Headers }): Promise<{ success: boolean }>
}

/** Narrow an auth instance to the apiKey plugin surface. */
export function apiKeyApi(auth: Auth): ApiKeyApi {
	return auth.api as unknown as ApiKeyApi
}

function buildKysely(database: AuthDatabase): Kysely<Record<string, unknown>> {
	const dialect =
		database.kind === "d1"
			? createD1SqliteDialect(database.database)
			: new NodeSqliteDialect({ database: database.database })
	return new Kysely<Record<string, unknown>>({ dialect })
}

export function createAuth(input: AuthInput): Auth {
	if (
		(input.mount === "tokens" || input.mount === "both" || input.oauth) &&
		!input.baseURL
	) {
		throw new Error(
			"[auth] baseURL is required for the tokens mount and the OAuth provider: the provider derives its issuer from it",
		)
	}
	const tokenMount = input.mount === "tokens" || input.mount === "both"
	const cookiesMount = input.mount === "cookies" || input.mount === "both"
	// A plain `cookies` mount is the browser-facing webapp instance: without
	// the injected TanStack Start plugin no Set-Cookie is ever written, so fail
	// loudly at construction instead of shipping a sign-in that silently does
	// not persist. `both` is exempt on purpose — it is the test mount, which
	// runs outside TanStack Start.
	if (input.mount === "cookies" && !input.cookiesPlugin) {
		throw new Error(
			"[auth] the cookies mount needs cookiesPlugin: pass tanstackStartCookies() from @excited-live/auth/tanstack-start",
		)
	}
	const as = input.oauth
	const loginPage = input.oauthLoginPage ?? "/sign-in"
	const consentPage = input.oauthConsentPage ?? "/consent"
	const plugins: BetterAuthPlugin[] = []
	if (tokenMount) {
		plugins.push(
			bearer(),
			// Agent onboarding keys: `elk_` prefix, metadata carries the agent
			// id, and keys never mock a full session (the API validates them
			// explicitly and maps permissions to scopes).
			apiKey({
				defaultPrefix: "elk_",
				enableMetadata: true,
				enableSessionForAPIKeys: false,
			}),
		)
	}
	// oauthProvider signs access tokens, which pulls in the jwt plugin's
	// tables — declared here so the schema check sees a consistent set.
	if (tokenMount || as) plugins.push(jwt())
	if (as) {
		plugins.push(
			oauthProvider({
				loginPage,
				consentPage,
				scopes: [...OAUTH_DEFAULT_SCOPES, ...(as.scopes ?? MCP_OAUTH_SCOPES)],
				// RFC 8707: a requested `resource` binds the access token's
				// audience. The MCP endpoint is the only resource this AS serves,
				// and every dynamically registered client is linked to it, so
				// clients never have to pre-register separately.
				resources: [as.resource],
				clientRegistrationDefaultResources: [as.resource],
				clientRegistrationAllowedResources: [as.resource],
				// MCP clients register themselves (public + PKCE, no secret).
				allowDynamicClientRegistration: true,
				allowUnauthenticatedClientRegistration: true,
				// No client_credentials: every token must belong to a user.
				grantTypes: ["authorization_code", "refresh_token"],
			}),
			// RFC 8628 for headless/cloud agents (Hermes on Discord): create a
			// code, the user approves it on /device, the agent polls
			// /device/token. One public client id, by design.
			deviceAuthorization({
				validateClient: (clientId) => clientId === (as.deviceClientId ?? DEVICE_CLIENT_ID),
				verificationUri: as.deviceVerificationUri,
			}),
		)
	} else if (tokenMount) {
		// Default scopes: openid, profile, email, offline_access —
		// offline_access is what gives mobile apps refresh tokens.
		plugins.push(oauthProvider({ loginPage, consentPage }))
	}
	// Cookie integration LAST (see the ordering note below). Injected by the
	// caller: only the webapp has the TanStack Start runtime it plugs into.
	if (cookiesMount && input.cookiesPlugin) plugins.push(input.cookiesPlugin)
	// Token plugins first; the cookie integration must stay LAST in the array
	// (better-auth warns otherwise: its after-hooks own the framework cookie
	// store, and plugins running after it can drop Set-Cookie headers).
	// The cast trades plugin-instantiated generics for a stable public type:
	// the full instance type exceeds the compiler's declaration-emit limit.
	return betterAuth({
		baseURL: input.baseURL,
		secret: input.secret,
		trustedOrigins: input.trustedOrigins,
		emailAndPassword: {
			enabled: true,
			// Verification mail needs an email provider (Resend or similar);
			// deferred per the migration plan, revisit before MLP launch.
			requireEmailVerification: false,
		},
		socialProviders: input.google
			? {
					google: {
						clientId: input.google.clientId,
						clientSecret: input.google.clientSecret,
					},
				}
			: undefined,
		database: kyselyAdapter(buildKysely(input.database), { type: "sqlite", transaction: false }),
		advanced: {
			database: {
				// The runtime schema check memoizes ONE shared promise per adapter
				// (a `sqlite_master` read started by whichever request touches the
				// adapter first). On Workers that promise dies with its request and
				// every later caller of the same instance hangs (#158). Our schema is
				// owned by the migrations in apps/api.
				validateSchema: false,
			},
		},
		plugins,
	}) as Auth
}
