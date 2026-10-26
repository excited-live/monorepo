export {
	AGENT_KEY_RATE_LIMIT,
	apiKeyApi,
	createAuth,
	DEVICE_CLIENT_ID,
	MCP_OAUTH_SCOPES,
	OAUTH_DEFAULT_SCOPES,
	type ApiKeyApi,
	type ApiKeyRecord,
	type ApiKeyVerifyError,
	type Auth,
	type AuthInput,
	type AuthOAuthInput,
} from "./server"
// The plugin's own key hasher (#178). A refusal has no key row from
// `verifyApiKey`, so the API reads the `apikey` row by the hash the plugin
// itself wrote when minting; re-exporting it keeps the hash in one place and
// pins the plugin version here rather than in every caller.
export { defaultKeyHasher } from "@better-auth/api-key"
// Browser clients live on `@excited-live/auth/client` only: this root entry
// is the server entry, and re-exporting better-auth/react here would put
// React + nanostores on the Workers bundle path (apps/api, tokens mount).
export { createD1SqliteDialect } from "./d1-sqlite-dialect"
export type { AuthDatabase, AuthMount, AuthD1DatabaseLike } from "./types"
