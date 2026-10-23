export {
	apiKeyApi,
	createAuth,
	DEVICE_CLIENT_ID,
	MCP_OAUTH_SCOPES,
	OAUTH_DEFAULT_SCOPES,
	type ApiKeyApi,
	type ApiKeyRecord,
	type Auth,
	type AuthInput,
	type AuthOAuthInput,
} from "./server"
// Browser clients live on `@excited-live/auth/client` only: this root entry
// is the server entry, and re-exporting better-auth/react here would put
// React + nanostores on the Workers bundle path (apps/api, tokens mount).
export { createD1SqliteDialect } from "./d1-sqlite-dialect"
export type { AuthDatabase, AuthMount, AuthD1DatabaseLike } from "./types"
