/**
 * Generates apps/api/migrations/0003_auth.sql from the Better Auth schema.
 *
 * Why a generated SQL file: `apps/api` owns one wrangler-standard migration
 * ledger (apps/api/migrations/*.sql mirrored into migrations.generated.ts and
 * applied at boot on D1 and node:sqlite). Better Auth's own programmatic
 * migrator would be a second, parallel path, so instead we dump the exact DDL
 * the installed better-auth version expects into the existing ledger.
 *
 * Run: pnpm --filter @excited-live/auth gen:schema
 * Then: pnpm --filter @excited-live/api gen:migrations
 *
 * The dump compiles against an empty database with every plugin from the
 * `both` mount enabled, so all tables (core + apiKey + oauth provider) land
 * in the file. Re-run whenever better-auth or a plugin bumps its schema.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { getMigrations } from "better-auth/db/migration"
import { NodeSqliteDialect } from "@better-auth/kysely-adapter/node-sqlite-dialect"
import { bearer, jwt } from "better-auth/plugins"
import { apiKey } from "@better-auth/api-key"
import { oauthProvider } from "@better-auth/oauth-provider"

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const repoDir = join(packageDir, "..", "..")
const outPath = join(repoDir, "apps", "api", "migrations", "0003_auth.sql")

const config = {
	appName: "excited-live",
	secret: "gen-schema-placeholder-not-a-secret",
	baseURL: "http://localhost:3000",
	emailAndPassword: { enabled: true },
	database: {
		dialect: new NodeSqliteDialect({ database: new DatabaseSync(":memory:") }),
		type: "sqlite" as const,
		transaction: false,
	},
	plugins: [bearer(), apiKey(), jwt(), oauthProvider({ loginPage: "/sign-in" })],
}

const migrations = await getMigrations(config as never, { throwOnUnsafe: false })
const ddl = await migrations.compileMigrations()

const statements = ddl
	.split(";")
	.map((statement) => statement.trim())
	.filter((statement) => statement.length > 0)

if (statements.length === 0) {
	console.error("compileMigrations returned no statements — better-auth version changed?")
	process.exit(1)
}

const tables = statements.filter((statement) => /create table/i.test(statement)).length
const indexes = statements.filter((statement) => /create (unique )?index/i.test(statement)).length

const header = [
	"-- 0003_auth.sql — Better Auth schema (generated, do not edit).",
	"--",
	"-- Source of truth: packages/auth (better-auth + apiKey + oauthProvider",
	"-- schema of the installed versions). Regenerate with:",
	"--   pnpm --filter @excited-live/auth gen:schema",
	"--   pnpm --filter @excited-live/api gen:migrations",
	"--",
	"-- Same ledger rules as 0001: one statement per `;` on its own line, no",
	"-- triggers or string literals containing `;`.",
]

mkdirSync(dirname(outPath), { recursive: true })
const body = statements.map((sql) => `${sql};\n`).join("\n")
writeFileSync(outPath, `${header.join("\n")}\n\n${body}`)

console.log(
	`Wrote ${outPath}: ${statements.length} statement(s) — ${tables} table(s), ${indexes} index(es).`,
)
