/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string
	readonly VITE_AUTH_SERVER_URL?: string
	readonly VITE_ENV_LABEL?: string
	readonly VITE_MCP_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
