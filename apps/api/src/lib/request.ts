/**
 * Shared request helpers for the API routers.
 */

/**
 * Identity for per-user records.
 *
 * Priority: the verified bearer-session user id pinned by the auth identity
 * middleware (c.set("userId")), then the `x-user-id` header (honored only
 * while auth is unconfigured — dev/prelive), else the "default" bucket.
 */
export function getUserId(c: {
	req: { header: (key: string) => string | undefined }
	get: (key: string) => string | undefined
}): string {
	return c.get("userId") || c.req.header("x-user-id") || "default"
}
