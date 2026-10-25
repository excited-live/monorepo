/**
 * Canonical public hosts the landing page links to. Change a host here and
 * every sign-in link, setup snippet and copy-paste prompt follows.
 *
 * - AUTH_ORIGIN: the live Better Auth sign-in/sign-up app (apps/webapp).
 * - MCP_URL: the live streamable-HTTP MCP endpoint (answers 401 without a
 *   token). The old mcp.excited.live host has no DNS record.
 */
export const AUTH_ORIGIN = 'https://auth.excited.live';
export const SIGN_IN_URL = `${AUTH_ORIGIN}/sign-in`;
export const SIGN_UP_URL = `${AUTH_ORIGIN}/sign-in?mode=signup`;
export const MCP_URL = 'https://api.excited.live/mcp';
