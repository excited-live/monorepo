import { DatabaseSync } from "node:sqlite"
import type { D1DatabaseLike, D1PreparedStatementLike, SqlValue } from "./types"

/**
 * Test double: a Cloudflare D1 binding backed by real SQLite (node:sqlite).
 *
 * The stores and the migrator never run against this directly — it sits on the
 * other side of the real D1 driver (src/db/d1.ts), so tests can exercise the
 * D1 code path (prepare/bind/all/first/run and D1's `.results` envelope)
 * without a Workers runtime. Production code never imports this file.
 *
 * Faithfulness note (FRO-72): real D1's `exec()` splits its input on newlines
 * and runs each line as its own statement, so a multi-line statement fails with
 * `D1_EXEC_ERROR ... incomplete input`. `node:sqlite`'s `db.exec` accepts
 * multi-line input, so delegating to it made this double strictly more
 * permissive than the real binding and `resolve.test.ts` structurally could not
 * catch the FRO-68 blocker. `exec` below now reproduces D1's line splitting and
 * its error shape; `prepare()` still takes a statement as one unit (as D1
 * does), which is exactly why the migrator must route DDL through it.
 */
export interface D1SqliteStub {
	binding: D1DatabaseLike
	/** Statement texts seen by the binding, in order (assertion aid). */
	calls: string[]
	close(): void
}

export function createD1SqliteStub(file: string): D1SqliteStub {
	const db = new DatabaseSync(file)
	// D1 enforces foreign keys on every database; so does the double.
	db.exec("PRAGMA foreign_keys = ON")
	const calls: string[] = []
	// Synchronous runner behind each prepared statement, so a batch can run its
	// statements back to back without another query interleaving.
	const runners = new WeakMap<D1PreparedStatementLike, () => { changes: number }>()

	const binding: D1DatabaseLike = {
		async exec(sql: string): Promise<void> {
			calls.push(`exec ${sql}`)
			const lines = sql.split("\n")
			for (let index = 0; index < lines.length; index++) {
				const line = lines[index] ?? ""
				if (line.trim().length === 0) continue
				try {
					db.exec(line)
				} catch (error) {
					const detail = error instanceof Error ? error.message : String(error)
					throw new Error(
						`D1_EXEC_ERROR: Error in line ${index + 1}: ${line}\n  ${detail}: SQLITE_ERROR`,
					)
				}
			}
		},
		prepare(sql: string): D1PreparedStatementLike {
			calls.push(`prepare ${sql}`)
			let params: readonly SqlValue[] = []
			const statement: D1PreparedStatementLike = {
				bind(...values: SqlValue[]): D1PreparedStatementLike {
					params = values
					return statement
				},
				async all<T = Record<string, unknown>>(): Promise<{ results?: T[] }> {
					return { results: db.prepare(sql).all(...params) as T[] }
				},
				async first<T = Record<string, unknown>>(): Promise<T | null> {
					return (db.prepare(sql).get(...params) ?? null) as T | null
				},
				async run(): Promise<{ meta: { changes: number } }> {
					return { meta: runSync() }
				},
			}
			const runSync = (): { changes: number } => {
				const result = db.prepare(sql).run(...params)
				return { changes: Number(result.changes) }
			}
			runners.set(statement, runSync)
			return statement
		},
		async batch(statements: D1PreparedStatementLike[]): Promise<unknown[]> {
			calls.push(`batch ${statements.length}`)
			// Same contract as D1: one transaction, all or nothing.
			db.exec("BEGIN")
			try {
				const results: unknown[] = []
				for (const statement of statements) {
					const runner = runners.get(statement)
					if (!runner) throw new Error("D1 stub: batch only accepts statements from this binding")
					results.push({ success: true, meta: { changes: runner().changes } })
				}
				db.exec("COMMIT")
				return results
			} catch (error) {
				db.exec("ROLLBACK")
				throw error
			}
		},
	}

	return {
		binding,
		calls,
		close: () => db.close(),
	}
}
