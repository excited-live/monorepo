/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	/** Webapp origin used by the MCP OAuth / device sign-in links. Unset hides those options. */
	readonly VITE_WEBAPP_URL?: string;
	readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
