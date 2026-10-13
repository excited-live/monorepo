import { betterAuth, type Auth as BetterAuthInstance, type BetterAuthOptions } from "better-auth"
import { bearer, jwt } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
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
}

/**
 * The auth instance type, pinned to the core options instantiation.
 *
 * Plugin-added endpoints (apiKey, oauth) are exercised over HTTP by apps —
 * keeping the public type on the core instantiation avoids a declaration-emit
 * type that exceeds the compiler's serialization limit.
 */
export type Auth = BetterAuthInstance<BetterAuthOptions>

function buildKysely(database: AuthDatabase): Kysely<Record<string, unknown>> {
	const dialect =
		database.kind === "d1"
			? createD1SqliteDialect(database.database)
			: new NodeSqliteDialect({ database: database.database })
	return new Kysely<Record<string, unknown>>({ dialect })
}

export function createAuth(input: AuthInput): Auth {
	if ((input.mount === "tokens" || input.mount === "both") && !input.baseURL) {
		throw new Error(
			"[auth] baseURL is required for the tokens mount: the OAuth provider derives its issuer from it",
		)
	}
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
		plugins: [
			...(input.mount === "tokens" || input.mount === "both"
				? [
						bearer(),
						apiKey(),
						// oauthProvider signs access tokens, which pulls in the jwt
						// plugin's tables — declared here so the schema check sees a
						// consistent set.
						jwt(),
						// Default scopes: openid, profile, email, offline_access —
						// offline_access is what gives mobile apps refresh tokens.
						oauthProvider({
							loginPage: input.oauthLoginPage ?? "/sign-in",
							consentPage: input.oauthConsentPage ?? "/consent",
						}),
					]
				: []),
			...(input.mount === "cookies" || input.mount === "both" ? [tanstackStartCookies()] : []),
		],
	}) as Auth
}
