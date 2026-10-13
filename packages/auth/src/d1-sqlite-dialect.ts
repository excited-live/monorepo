import {
	Kysely,
	type CompiledQuery,
	type DatabaseConnection,
	type DatabaseIntrospector,
	type Dialect,
	type Driver,
	type QueryResult,
	SqliteAdapter,
	SqliteIntrospector,
	SqliteQueryCompiler,
} from "kysely"
import type { AuthD1DatabaseLike, AuthD1PreparedStatementLike, SqlValue } from "./types"

/**
 * Kysely dialect for Cloudflare D1.
 *
 * @better-auth/kysely-adapter ships node-sqlite and bun-sqlite dialects but
 * not a D1 one (its D1 chunk is not exported), so this implements the same
 * idea here. Every statement goes through `prepare().bind().all()`, which is
 * what D1 supports and what also returns RETURNING rows. D1 has no
 * interactive transactions (see the D1 batch docs), matching the adapter
 * being configured with `transaction: false`.
 */

class D1Connection implements DatabaseConnection {
	readonly #database: AuthD1DatabaseLike

	constructor(database: AuthD1DatabaseLike) {
		this.#database = database
	}

	async executeQuery<R>(compiledQuery: CompiledQuery<unknown>): Promise<QueryResult<R>> {
		const statement = this.#database.prepare(compiledQuery.sql)
		const bound = bindParameters(statement, compiledQuery.parameters)
		const result = await bound.all<R>()
		const rows = result.results ?? []
		const affected = isWriteQuery(compiledQuery.query.kind)
			? result.meta && typeof result.meta.changes === "number"
				? BigInt(result.meta.changes)
				: undefined
			: undefined
		return affected === undefined ? { rows } : { rows, numAffectedRows: affected }
	}

	streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
		return {
			[Symbol.asyncIterator]() {
				return this
			},
			async next(): Promise<IteratorResult<QueryResult<R>>> {
				throw new Error("D1 does not support streaming queries")
			},
		}
	}
}

class D1Driver implements Driver {
	readonly #database: AuthD1DatabaseLike

	constructor(database: AuthD1DatabaseLike) {
		this.#database = database
	}

	async acquireConnection(): Promise<DatabaseConnection> {
		return new D1Connection(this.#database)
	}

	async init(): Promise<void> {
		// D1 needs no driver-level warmup; migrations are owned by apps/api.
	}

	async beginTransaction(): Promise<void> {
		throw new Error("D1 does not support interactive transactions")
	}

	async commitTransaction(): Promise<void> {
		throw new Error("D1 does not support interactive transactions")
	}

	async rollbackTransaction(): Promise<void> {
		throw new Error("D1 does not support interactive transactions")
	}

	async releaseConnection(): Promise<void> {
		// D1 bindings are managed by the runtime; nothing to release.
	}

	async destroy(): Promise<void> {
		// No pooled resources to tear down.
	}
}

function bindParameters(
	statement: AuthD1PreparedStatementLike,
	parameters: readonly unknown[] | undefined,
): AuthD1PreparedStatementLike {
	if (!parameters || parameters.length === 0) return statement
	return statement.bind(...(parameters as SqlValue[]))
}

/**
 * Kysely node kinds are string constants at runtime (QueryKind itself is
 * type-only and does not survive import), so write detection compares the
 * kind strings directly.
 */
function isWriteQuery(kind: string): boolean {
	return (
		kind === "InsertQuery" ||
		kind === "UpdateQuery" ||
		kind === "DeleteQuery"
	)
}

/** SqliteIntrospector's constructor accepts Kysely<any>; referenced indirectly so this source stays any-free. */
type IntrospectorDb = ConstructorParameters<typeof SqliteIntrospector>[0]

export function createD1SqliteDialect(database: AuthD1DatabaseLike): Dialect {
	return {
		createAdapter: () => new SqliteAdapter(),
		createDriver: () => new D1Driver(database),
		createIntrospector: (db: Kysely<Record<string, unknown>>): DatabaseIntrospector =>
			new SqliteIntrospector(db as IntrospectorDb),
		createQueryCompiler: () => new SqliteQueryCompiler(),
	}
}
