import type { D1DatabaseLike, SqlDriver, SqlStatement, SqlValue } from "./types"

/**
 * Driver for a real Cloudflare D1 binding (Workers / `wrangler dev`).
 *
 * Thin by design: D1 already exposes the shape the stores need. Everything we
 * do here is bind parameters and collapse D1's envelopes (`.results`, null).
 *
 * `exec()` is the one place where D1 is NOT the same shape as `node:sqlite`:
 * `D1Database.exec()` splits its input on newlines and runs each line as its
 * own statement, so a multi-line statement (every `CREATE TABLE` we run is
 * multi-line) dies with `D1_EXEC_ERROR ... incomplete input` — reproduced
 * against real workerd in FRO-68. `prepare().run()` takes the statement as one
 * unit, so even the unparameterised DDL path goes through it and D1 is never
 * handed a statement it would split. `splitStatements` upstream guarantees one
 * statement per call.
 */
export function createD1Driver(binding: D1DatabaseLike): SqlDriver {
	return {
		kind: "d1",
		async exec(sql: string): Promise<void> {
			await binding.prepare(sql).run()
		},
		async all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
			const result = await binding.prepare(sql).bind(...params).all<T>()
			return result.results ?? []
		},
		async first<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
			return await binding.prepare(sql).bind(...params).first<T>()
		},
		async run(sql: string, params: readonly SqlValue[] = []): Promise<{ changes: number }> {
			const result = await binding.prepare(sql).bind(...params).run()
			return { changes: result.meta?.changes ?? 0 }
		},
		async batch(statements: readonly SqlStatement[]): Promise<void> {
			// One D1 batch is one transaction: all statements commit or none does.
			await binding.batch(
				statements.map((statement) => binding.prepare(statement.sql).bind(...(statement.params ?? []))),
			)
		},
		close(): void {
			// D1 connections are managed by the platform.
		},
	}
}
