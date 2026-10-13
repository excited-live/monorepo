/**
 * Structural types for the auth layer.
 *
 * Deliberately dependency-free: the D1 shape mirrors the minimal binding
 * surface `apps/api/src/db/types.ts` models, so `packages/auth` and
 * `apps/api` stay decoupled from `@cloudflare/workers-types`.
 */

/** Parameter types accepted by SQLite drivers (blobs unused, like apps/api). */
export type SqlValue = string | number | null

/** The subset of the Cloudflare D1 binding API the auth Kysely dialect needs. */
export interface AuthD1PreparedStatementLike {
	bind(...values: unknown[]): AuthD1PreparedStatementLike
	all<T = Record<string, unknown>>(): Promise<D1AllResult<T>>
	run(): Promise<unknown>
}

export interface D1AllResult<T = Record<string, unknown>> {
	results?: T[]
	meta?: { changes?: number }
}

export interface AuthD1DatabaseLike {
	prepare(sql: string): AuthD1PreparedStatementLike
	exec(sql: string): Promise<unknown>
}

/** A real D1 binding or a test double shaped like one. */
export type AuthDatabase =
	| { kind: "d1"; database: AuthD1DatabaseLike }
	| { kind: "node-sqlite"; database: import("node:sqlite").DatabaseSync }

/**
 * Which plugin set the consumer needs.
 *
 * - `cookies`  → webapp mount: TanStack Start cookie handling.
 * - `tokens`   → api mount: bearer + API keys + OAuth provider (native/public API).
 * - `both`     → one process serving both (tests, single-app deployments).
 */
export type AuthMount = "cookies" | "tokens" | "both"
