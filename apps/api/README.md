# excited.live API (`apps/api`)

Standalone Hono API behind the webapp. The webapp's BFF (`apps/webapp/src/routes/api/v1/*`)
proxies `/api/v1/*` here and injects the authenticated user as `x-user-id`.

Routes: `GET /health`, `GET|PUT /api/v1/plan`, `GET|PUT /api/v1/settings`,
`POST /api/v1/sim/monte-carlo`, `POST /api/v1/sim/simulate`, and the accounting
book under `/api/v1/accounting` (entities, assets, incomes, expenses, liabilities,
transfers, summary, ledger, projection). The accounting data model, its tables and
the write rules are in [`docs/accounting-data-model.md`](../../docs/accounting-data-model.md).

## OpenAPI + docs

The spec is generated from the code: each route carries a `describeRoute()`
annotation (`src/openapi/docs.ts`, schemas in `src/openapi/schemas.ts`) and the
app serves the result at `GET /openapi.json` (public, like `/health`).
Annotations are documentation only — they never validate or change a request.
Entity schemas are `satisfies`-checked against `@excited-live/accounting`, so engine
changes break typecheck instead of drifting.

```bash
pnpm --filter @excited-live/api gen:openapi   # writes openapi.json AND the docs pages
```

`openapi.json` is committed and pinned by `src/openapi/openapi.parity.test.ts`.
The same command runs `apps/landingpage/scripts/gen-api-docs.mjs`, which renders
`apps/landingpage/content/docs/api/*.mdx` (the `/docs/api` reference). New route?
Add `route({...})` to it, run the command, commit all three outputs.

Only the accounting book (see `docs/accounting-data-model.md`), plan, settings, sim,
catalog and `auth/me` are documented. Better
Auth's own tables (user, session, api key…) are deliberately not exposed as CRUD.

## Persistence — Cloudflare D1

Plan and settings used to live in in-memory `Map`s: every restart wiped them.
They now live in **Cloudflare D1** (SQLite) in the target deployment, and in a
local **SQLite file** for dev/test — same engine, same SQL, same store code.

```
request -> app.ts -> c.var.db (SqlDriver)
                        |-- D1 binding on the runtime env (`c.env.DB`)  -> src/db/d1.ts
                        `-- otherwise: node:sqlite file                 -> src/db/node-sqlite.ts
                                                                          .data/excited-live.sqlite
```

| File | Role |
| --- | --- |
| `migrations/0001_init.sql` | Source of truth: D1-compatible SQL, also read by `wrangler d1 migrations apply` |
| `src/db/migrations.generated.ts` | Generated mirror of the SQL (Workers cannot read files at runtime). `pnpm --filter @excited-live/api gen:migrations` |
| `src/db/apply.ts` | Applies pending migrations, tracked in the wrangler-standard `d1_migrations` table |
| `src/db/d1.ts` / `src/db/node-sqlite.ts` | The two drivers behind `SqlDriver` |
| `src/db/d1-sqlite-stub.ts` | Test double for a D1 binding (a faithful one: its `exec()` splits on newlines exactly like real D1) |
| `src/db/index.ts` | Resolution order + one cached handle per process |
| `src/stores/plan-store.ts` | `plans(user_id PK, data JSON, updated_at)` |
| `src/stores/settings-store.ts` | `user_settings(user_id PK, profile_name, birthday, gender, updated_at)` |
| `scripts/persistence-proof.sh` | Restart proof on the Node driver |
| `scripts/d1-proof.sh` | Restart proof on a **real** local D1 binding (workerd) |

Schema (see `migrations/0001_init.sql`): `plans` keeps the plan document as a
JSON snapshot (whatever the client PUT comes back byte-for-byte on GET — the
shape of `PlanInput` is owned by `@excited-live/sim`); `user_settings` uses one
column per field.

Contract notes:
- Keying is unchanged: `x-user-id`, else the `default` bucket.
- Response shapes are unchanged, including `birthday` being **absent** (not
  `null`) when unset — the webapp's Settings page relies on that.
- Unknown user: `GET /api/v1/plan` returns `defaultPlanInput()`, `GET /api/v1/settings`
  returns `{ profileName: "", gender: "female" }` — same as before.
- No DB configured is not a silent-memory mode: the process opens local SQLite
  and fails loudly at boot if that is impossible (`EXCITED_API_DB_PATH` is how
  you point it somewhere writable).

Intentional deviations (FRO-72):

- **Malformed `PUT /api/v1/settings` reads back normalised.** `PUT` still echoes
  the request body byte for byte, but the row is three columns, so a body that
  the old in-memory handler echoed verbatim comes back through the columns:
  `PUT {}` → old `{}`, now `{"profileName":"","gender":"female"}`; unknown keys
  are dropped; a non-string `profileName`/`gender` falls back to the column
  default; `birthday: null` reads back absent. Every documented contract case —
  all three keys with a `YYYY-MM-DD` birthday, or no birthday at all — is
  byte-identical to the pre-persistence handler.
  Pinned by `src/app.test.ts` → "normalises a malformed PUT on read…".
- **The D1 driver never uses `D1Database.exec()`.** Real D1's `exec()` splits its
  input on newlines and runs each line as its own statement, so the multi-line
  `CREATE TABLE`s the migrator runs died with
  `D1_EXEC_ERROR ... incomplete input` (FRO-68). `createD1Driver`'s `exec()` is
  `await binding.prepare(sql).run()` instead; `splitStatements` still guarantees
  one statement per call. Proof: `scripts/d1-proof.sh` and
  `src/db/d1-driver.test.ts`.

## Local dev / tests

```bash
pnpm --filter @excited-live/api dev        # tsx watch, migrates on boot
pnpm --filter @excited-live/api test       # vitest: stores, migrations, HTTP contract, restart
pnpm --filter @excited-live/api gen:migrations
bash apps/api/scripts/persistence-proof.sh # save -> restart -> still there (node:sqlite)
bash apps/api/scripts/d1-proof.sh          # same, on a REAL local D1 binding (workerd)
```

Both scripts' raw output is checked in at `docs/persistence-proof.md`. The second
one needs network on first run (npx pulls wrangler + workerd) and nothing else.

Env vars:

| Var | Default | Meaning |
| --- | --- | --- |
| `EXCITED_API_DB_PATH` | `.data/excited-live.sqlite` (relative to the process cwd) | Local SQLite file |
| `EXCITED_API_AUTO_MIGRATE` | on | `0` skips boot migrations (e.g. when wrangler owns them) |
| `PORT` | `8000` | HTTP port |
| `EXCITED_WEBAPP_URL` | unset | Webapp origin that hosts the MCP authorization server (`<origin>/api/auth`). When set, `/mcp` also accepts OAuth JWT access tokens and serves the protected-resource metadata; unset keeps the A1 behaviour (API keys, sessions, dev passthrough). |
| `BETTER_AUTH_URL` | request origin | Canonical origin of the `/api/v1/auth` mount (Better Auth issuer). Set it behind a proxy so tokens carry a stable issuer; it does **not** pin MCP discovery. The `/.well-known/oauth-protected-resource` `resource` and the 401 `resource_metadata` URL follow the request host, so a custom-domain Worker advertises that domain (#116). |

Local runs need Node >= 22.13 (`node:sqlite` without a flag).

## MCP sign-in link (OAuth 2.1 + device flow)

`/mcp` is a protected resource (RFC 9728). Discovery:

- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-protected-resource/mcp`

Both return `resource` (`<api origin>/mcp`), `authorization_servers`
(`<EXCITED_WEBAPP_URL>/api/auth`), `scopes_supported`
(`onboarding`, `accounting:read`, `accounting:write`) and
`bearer_methods_supported: ["header"]`. They answer 404 when
`EXCITED_WEBAPP_URL` is unset.

The authorization server itself runs on the WEBAPP mount (it has the sign-in
and consent UI plus the browser cookies). The API only verifies tokens, in
this order (see `src/modules/mcp/mcp.auth.ts`): API key (`elk_…`) → OAuth JWT
(signature via the webapp JWKS, plus issuer, audience and expiry; scopes come
from the `scope` claim, with `onboarding` granting `onboarding:read` +
`onboarding:write`) → Better Auth session bearer (device-flow tokens and the
mobile session) → dev passthrough when auth is unconfigured.

The device flow (`/api/auth/device/code` → user approves on the webapp
`/device` → `/api/auth/device/token`) issues a first-party Better Auth session,
so it resolves through the session branch above rather than as a JWT.

## Deployment readiness (no action taken here)

Wiring this to Cloudflare is a separate task; nothing below has been run.

1. `npx wrangler d1 create excited-live-api` — prints the `database_id`.
2. Paste it into `apps/api/wrangler.toml` (`[[d1_databases]]`, binding `DB`,
   `database_id = "REPLACE_WITH_DATABASE_ID"`). `migrations_dir` is already
   `migrations`.
3. `npx wrangler d1 migrations apply excited-live-api --remote` (CI or manual)
   — or let the Worker migrate itself on first request: it applies the same
   files, idempotently, through the shared `d1_migrations` ledger
   (`EXCITED_API_AUTO_MIGRATE=0` disables that).
4. `pnpm --filter @excited-live/api build` produces `dist/worker.js` (Workers
   entry, `export default { fetch }`) next to `dist/index.js` (Node entry).
   `wrangler.toml` already points `main` at `dist/worker.js`.
5. Deploy the Worker (`wrangler deploy`) and point the webapp's
   `BACKEND_API_URL` at it.
6. No env var is required for D1 (the binding provides it); add `nodejs_compat`
   only if the Workers runtime asks for it.

The Workers entry's module graph carries no Node builtins: the local fallback's
`node:fs` / `node:path` / `node:sqlite` imports are dynamic, with computed
specifiers, so `dist/chunk-*.js` has no static `fs` / `path` / `sqlite` import
(FRO-72 nit 3, verified against the built bundle).

Verified locally (FRO-72): a **real** local D1 binding, in the real Workers
runtime (`wrangler dev --local`, workerd, unmodified `wrangler.toml`,
auto-migrate on) — `GET /api/v1/settings` is `200` (it was a hard `500` before
the `exec()` fix), plan + settings round-trip, and both survive a runtime
restart. Transcript + method: `docs/persistence-proof.md`;
re-run with `bash apps/api/scripts/d1-proof.sh`.
