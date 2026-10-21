# Plan: AI-native onboarding (MCP server + agent sign-in)

Status: approved by Prame 2026-10-21. One PR, branch `feat/ai-native-onboarding`.

## Why

Manual onboarding in `apps/biz-mobile` (6-step stepper on Home) works but has too
much friction: every business, asset, liability, income and expense is typed by
hand. PRD P4 ("Agent-Ready by Default") and US-BIZ-010 already call for an MCP
server with scoped keys. This plan makes "set up with your AI agent" the
recommended onboarding path: the user copies one prompt into the agent they
already use, and the agent interviews them and writes everything through MCP.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| MCP host | Inside `apps/api`, route `/mcp` (Streamable HTTP, stateless, JSON responses). Same DB, same deploy. |
| Tool layout | A tool registry (`apps/api/src/modules/mcp/tools/*`). Onboarding suite first; future suites are new files added to one list. |
| Tool backend | Tools call the accounting service, onboarding store and catalog **in-process**. No HTTP loopback. |
| Auth: API key | Better Auth `apiKey()` (already mounted). Prefix `elk_`. Keys are minted server-side by our own `/api/v1/agent-keys` endpoint so permissions are set by us, never by the client. Default expiry **90 days**, revocable in Settings. |
| Auth: sign-in link (chat apps, modern coding agents) | Standard MCP OAuth 2.1. Authorization server = **webapp** (it has the sign-in UI and cookies). Resource server = API `/mcp`, which verifies JWT access tokens and advertises the AS via RFC 9728 protected-resource metadata. Dynamic client registration on. |
| Auth: sign-in link (cloud/headless agents: Hermes on Discord) | OAuth device authorization (RFC 8628) via Better Auth `deviceAuthorization` plugin on the webapp mount. Agent posts the link in Discord, user taps it, approves, agent polls for its token. |
| Onboarding method | Persisted server-side: `user_onboarding.method` = `"agent" \| "manual" \| null`. |
| Scope | `apps/biz-mobile` only (the only app with onboarding today). Webapp only gets the `/consent` and `/device` auth pages. |
| Not in scope | Agent audit tagging (`source: "agent"`), REST `/api/v1/*` accepting API keys, slip ingestion tools, webapp onboarding. |

## Architecture

```
 user's agent ──(MCP, Bearer elk_… | OAuth JWT | device session)──▶ apps/api  /mcp
                                                                     │  resolvePrincipal → { userId, scopes }
                                                                     │  McpServer (per request) + tool registry
                                                                     ▼
                                                     accounting service · onboarding store · catalog
 chat app / coding agent OAuth ──▶ webapp  /api/auth/oauth2/*  (+ /sign-in, /consent pages)
 Hermes device flow           ──▶ webapp  /api/auth/device/*   (+ /device page)
 mobile app ──(session bearer)──▶ apps/api /api/v1/agent-keys  (mint / list / revoke)
```

## Workstream A1 — MCP server + API keys (apps/api, packages/auth, packages/accounting)

### A1.1 Shared onboarding model → `packages/accounting`
- Move the pure parts of `apps/biz-mobile/src/domain/onboarding.ts` (`OnboardingStepId`, `ONBOARDING_STEPS`, `OnboardingStepStatus`, `OnboardingProgress`, `isOnboardingStepId`, `deriveOnboardingSteps`, `isOnboardingComplete`, `countCompletedSteps`, `OnboardingStepState`) into `packages/accounting/src/onboarding.ts`, exported from the package index. Add unit tests.
- `apps/biz-mobile/src/domain/onboarding.ts` re-exports them and keeps only the view types (`OnboardingEntryView`, `OnboardingEntitySectionView`, `OnboardingStepView`). Behaviour unchanged.
- Entry counting rule (must match `useHome.ts`): `add_business` = number of business entities; `assets_wallet` / `add_liability` / `add_income` / `add_expense` = rows of that kind on the **personal** entity (`assets_wallet` counts hardware/gear assets, as in `useHome.ts`). Put a pure `countOnboardingEntries(...)` helper next to the step model so the API uses the same rule.

### A1.2 Onboarding method column
- New migration `apps/api/migrations/0002_onboarding_method.sql`: `ALTER TABLE user_onboarding ADD COLUMN method TEXT;` then `pnpm --filter @excited-live/api gen:migrations`.
- Store + `UserOnboardingSchema` / `UpdateUserOnboardingSchema`: `method: "agent" | "manual" | null` (GET returns `null` when unset; PUT accepts optional `method`, `null` clears it).

### A1.3 API keys
- `packages/auth/src/server.ts`: configure `apiKey({ defaultPrefix: "elk_", enableMetadata: true, … })`. Keep `enableSessionForAPIKeys` **false** (see plan-auth-migration.md).
- Permissions model (Better Auth api-key `permissions` = `Record<resource, action[]>`): `{ onboarding: ["read","write"], accounting: ["read","write"] }` for onboarding keys.
- New router `apps/api/src/routes/agent-keys.ts`, mounted at `/api/v1/agent-keys` (behind the existing identity middleware, so only a real session can call it; an API key can never mint keys):
  - `POST /` body `{ agentId: string, name?: string }` → server-side `auth.api.createApiKey({ body: { userId, name, expiresIn: 90 days, permissions, metadata: { purpose: "agent", agentId } } })` → `{ id, key, name, start, expiresAt }`. The full `key` is returned only here.
  - `GET /` → list `{ id, name, start, agentId, createdAt, expiresAt, lastRequest }` for the user (never the key).
  - `DELETE /:id` → revoke (only the owner's key; 404 otherwise).
  - When auth is not configured (no `BETTER_AUTH_SECRET`): return 503 like `/auth/me`.
- OpenAPI annotations on every route; `pnpm --filter @excited-live/api gen:openapi` and commit all outputs.

### A1.4 MCP server
- Dependency: `@modelcontextprotocol/sdk` (latest) in `apps/api`. Use `McpServer` + `WebStandardStreamableHTTPServerTransport` (Workers-compatible, Fetch `Request`/`Response`) in stateless mode (`sessionIdGenerator: undefined`, `enableJsonResponse: true`), a fresh server + transport per request. **Check the installed SDK's exports and Zod support before writing code**; if the web-standard transport is missing, use `@hono/mcp`.
- The Workers bundle must stay free of Node builtins (same rule as `src/db/node-sqlite.ts`).
- Files:
  - `apps/api/src/modules/mcp/mcp.route.ts`: `app.all("/mcp", …)`, mounted in `app.ts` **outside** `/api/v1` (own auth). Resolves the DB the same way `/api/v1/*` does.
  - `apps/api/src/modules/mcp/mcp.auth.ts`: `resolvePrincipal(c) → { userId, scopes: Set<string>, via: "apiKey" | "oauth" | "session" | "dev" } | null`.
    - `Authorization: Bearer elk_…` or `x-api-key: elk_…` → `auth.api.verifyApiKey` → `userId = key.referenceId`, scopes from permissions (`onboarding:read`, `onboarding:write`, …).
    - Other Bearer → Better Auth session (`getSession`) → all scopes. (A2 adds OAuth JWT before this.)
    - Auth not configured → dev passthrough (`x-user-id`, else `default`), all scopes, same as the identity middleware today.
    - No/invalid credentials → `401` with `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"` (A2 serves that document; A1 can already send the header).
  - `apps/api/src/modules/mcp/registry.ts`: `McpToolDefinition { name, title, description, inputSchema, requiredScope, handler(ctx, input) }`, `ctx = { userId, db, services }`. Registration rejects calls whose `requiredScope` the principal lacks with an MCP tool error (not a crash). `ALL_TOOLS = [...onboardingTools]`.
  - `apps/api/src/modules/mcp/instructions.ts`: server `instructions` + an MCP prompt `onboard_me` holding the full interview guide (below). Client-side prompts stay short; the guide is versioned server-side.
  - `apps/api/src/modules/mcp/tools/onboarding.tools.ts`.
- Onboarding tools. Input shapes **reuse the zod schemas in `accounting.schemas.ts`**. Do not invent new field names. `entityId` defaults to the personal entity where the REST route allows it.

| Tool | Scope | Does |
| --- | --- | --- |
| `get_onboarding_status` | onboarding:read | Steps in order with status, entry count, entry labels (so the agent can avoid duplicates), `nextStep`, `isComplete`, `method`. |
| `list_entities` | accounting:read | Personal + business entities. |
| `create_business` | accounting:write | Create a business entity. |
| `add_asset` | accounting:write | Wallet/cash/gear asset (createAsset). |
| `add_liability` | accounting:write | Loan/card/etc. (createLiability). |
| `add_income` | accounting:write | Income (createIncome). Career salary goes through setCareerIncome. |
| `add_expense` | accounting:write | Expense or subscription (createExpense). |
| `lookup_catalog` | accounting:read | Catalog resolve/suggest, to autofill prices for "Netflix", "MacBook Pro", etc. |
| `complete_onboarding_step` | onboarding:write | Mark a step done. Same gate as the UI: needs at least 1 entry (create_account excepted). Also sets `method = "agent"` if unset. |
| `skip_onboarding_step` | onboarding:write | Only for skippable steps. |
| `get_financial_summary` | accounting:read | Accounting summary, for the closing recap. |

- Domain errors (`DomainError`) become MCP tool errors with the message. They must not become 500s.
- Interview guide (in `instructions.ts`): reply in the user's language (Thai or English); go step by step in `ONBOARDING_STEPS` order; ask about one step at a time, in a short batch; default currency THB; use `lookup_catalog` for known products and subscriptions; show what you are about to save and get a yes before writing; after a step's entries call `complete_onboarding_step`; optional steps can be skipped when the user says so; finish with `get_financial_summary` and a short recap; tell the user they can review everything in the excited.live app.

### A1.5 Tests (vitest, `apps/api`)
`initialize` → `tools/list` → `tools/call` round-trip with a minted API key; 401 + `WWW-Authenticate` with no key; scope denial; a revoked key is rejected; agent-keys create/list/revoke plus cross-user isolation; `complete_onboarding_step` gate; onboarding `method` round-trip; migration applies on an existing DB.

## Workstream A2 — sign-in link (packages/auth, apps/webapp, apps/api)

Load the `auth_better` skill first. Middleware order and guard semantics must not change.

### A2.1 Authorization server on the webapp mount
- `createAuth` gets an option to enable the OAuth provider and device authorization on the **cookies** mount, with `baseURL` = webapp origin (issuer `https://<webapp>/api/auth`). Login page `/sign-in`, consent page `/consent`, on the webapp's own origin, so cookies just work.
- `oauthProvider`: dynamic client registration on for public clients (PKCE required); custom scopes `onboarding`, `accounting:read`, `accounting:write` plus the defaults; access tokens are JWTs whose audience is the MCP resource (`<api origin>/mcp`). Verify the exact option names against `@better-auth/oauth-provider@1.7.7` types in node_modules. Do not guess them.
- `deviceAuthorization` (from `better-auth/plugins`): accept one public client id `excited-live-agent`; verification URI `<webapp>/device`.
- If the auth schema changes, re-run `packages/auth` `gen:schema` and api `gen:migrations` (see plan-auth-migration.md notes) as a **new** migration file.

### A2.2 Webapp pages (design system, `{ en, th }` strings, i18n skill)
- `/sign-in`: when it is reached from an OAuth/device flow, resume that flow after sign-in instead of going to the dashboard. Keep `returnPathname` behaviour.
- `/consent`: shows the client name and requested scopes in plain language ("Read and edit your books"), with Allow / Deny.
- `/device`: user-code entry (prefilled from `verification_uri_complete`), sign-in if needed, Approve / Deny, then a success state ("You can go back to your agent").
- All three must stay reachable signed out where needed (see the auth_better guard rules).

### A2.3 Resource server on `/mcp`
- `GET /.well-known/oauth-protected-resource` (and `/.well-known/oauth-protected-resource/mcp`) on the API: `{ resource: "<api>/mcp", authorization_servers: ["<webapp issuer>"], scopes_supported, bearer_methods_supported: ["header"] }`.
- `resolvePrincipal` order: API key → OAuth JWT (verify signature via the AS JWKS, plus issuer, audience and expiry; scopes from the `scope` claim) → Better Auth session bearer (device-flow tokens and mobile tokens) → 401.
- New env: `EXCITED_WEBAPP_URL` (AS issuer origin) on the API, and `EXCITED_API_URL` on the webapp (resource/audience). Document both in the api README and the auth_better skill.
- Tests: protected-resource metadata; a valid JWT is accepted; wrong audience or expired is rejected; device flow end to end (code → approve → token → `/mcp` call) where it is testable in-process.

## Workstream B — mobile UI (apps/biz-mobile)

Load `mobile_architecture` (mandatory, follow `references/page_component_structure.md`), `design_system`, `i18n_platform`. Every string is `{ en, th }`.

### B.1 Data
- `service/onboarding`: add `method: "agent" | "manual" | null` to the type and a `setOnboardingMethod` mutation (PUT with `method`). This is the contract A1 implements.
- `service/agentKeys` (new): `createAgentKey({ agentId })`, `listAgentKeys()`, `revokeAgentKey(id)` against `/api/v1/agent-keys` (shapes in A1.3).
- MCP URL = `${getApiBaseUrl()}/mcp`. Webapp origin for link flows = `import.meta.env.VITE_WEBAPP_URL` (add to the env typing; fall back to hiding link options when it is unset).
- Do **not** edit `domain/onboarding.ts` (A1 owns it).

### B.2 Agent catalog: `domain/agents.ts` (pure data + pure prompt builders)
```ts
type AgentKind = "coding" | "chat" | "cloud"
type AgentAuth = "apiKey" | "oauth" | "device"
interface AgentOption { id; name; kind; featured: boolean; auth: AgentAuth[] /* first = default */; iconKey }
```
- Featured (slider, in this order): Claude Code, Codex, Cursor, Claude (chat), ChatGPT, Hermes. Then a **More** button.
- More: OpenCode, Gemini CLI, Antigravity, Windsurf, VS Code (Copilot), Cline, Zed, "Other MCP client", "Other cloud agent".
- Defaults: coding = `apiKey` first, `oauth` offered where the client supports MCP OAuth; chat (Claude, ChatGPT) = `oauth` only; cloud (Hermes, other cloud) = `device` first, `apiKey` second.
- `buildAgentPrompt({ agent, mcpUrl, lang, auth })` where `auth` is `{ kind: "apiKey", key } | { kind: "oauth" } | { kind: "device", webappUrl }`. Pure, unit-tested (snapshot the strings).
  - Coding + apiKey: one prompt that has the agent install the server itself with the agent-specific command or config (Claude Code `claude mcp add --transport http excited-live <url> --header "Authorization: Bearer <key>"`; Codex `~/.codex/config.toml` `[mcp_servers.excited-live]`; Cursor `~/.cursor/mcp.json`; OpenCode `opencode.json` `mcp` remote; Gemini CLI `~/.gemini/settings.json`; generic fallback: "add a remote Streamable-HTTP MCP server named excited-live at <url> with header …"), reload tools, then "use the `onboard_me` prompt / call `get_onboarding_status` and follow the server's guide; talk to me in <lang>". Check each config format against that tool's current docs.
  - Coding + oauth: same, without the header; "sign in when your client opens the browser".
  - Chat (oauth): **numbered setup steps** shown in the UI (Claude: Settings → Connectors → Add custom connector → paste URL → Connect → sign in; ChatGPT: Settings → Connectors / Apps → developer mode → add the MCP server URL → sign in), then a short prompt to paste into a new chat.
  - Cloud + device: the prompt tells the agent to `POST <webapp>/api/auth/device/code` with `client_id=excited-live-agent`, send the user the `verification_uri_complete` link, poll `/api/auth/device/token` every `interval` seconds, then register the MCP server with `Authorization: Bearer <access_token>` and start onboarding. Cloud + apiKey: like coding + apiKey, but the config instructions are generic.

### B.3 Screens (inside the Home onboarding section)
- `HomeOnboardingChecklist` becomes a switch on `method` while onboarding is not complete:
  - `null` → **`OnboardingMethodChooser`**: two cards. "Set up with your AI agent" first, with a **Recommended** badge and a one-line benefit ("Tell your agent about your money. It fills everything in."). "Set up manually" second. Tapping one saves `method`.
  - `"manual"` → the existing stepper, unchanged, plus a small "Use an AI agent instead" link.
  - `"agent"` → **`OnboardingAgentSetup`**:
    1. Agent slider (horizontal scroll of the featured agents, selectable cards) + **More** button that opens a drawer with the full list grouped by kind.
    2. Auth choice for the selected agent (segmented control, only when it supports more than one; default = first).
    3. API key path: "Generate key" button → key minted → injected into the prompt. Copy shown once: "Shown once. Anyone with this key can edit your books. Revoke anytime in Settings." Regenerating revokes nothing automatically. Say so.
    4. Prompt box: read-only monospace, **Copy** button (clipboard with a fallback, plus a "Copied" state). For chat agents: numbered steps + copy button for the connector URL, then the prompt box.
    5. Live progress: while this view is mounted, refetch onboarding status every 5 s and show the 6 steps as a compact ✓ list. "Waiting for your agent…" until something changes, then "Your agent is working…", then "All set" once complete (the section then disappears as today).
    6. "Set up manually instead" link → `method = "manual"`.
- Settings page: new **Connected agents** section: list of agent keys (name, agent, created, last used, expires) with Revoke (confirm dialog). Empty state points to Home onboarding.

### B.4 Tests
Unit tests for `domain/agents.ts` prompt builders. Direct-mount Playwright visual specs for `OnboardingMethodChooser`, `OnboardingAgentSetup` (API key, chat and device variants) and the Settings section, following the existing `*.spec.tsx` pattern. **Do not commit locally recorded PNGs.** Baselines are recorded on the CI runner after the PR is opened.

## Delivery

- One PR from `feat/ai-native-onboarding`. A1 and B run in parallel worktrees; A2 runs after A1 on top of it; then everything is merged into this branch.
- Done criteria on the merged branch: `pnpm build && pnpm typecheck && pnpm lint && pnpm test` green (0 warnings). `pnpm test:visual:mobile` run; baselines re-recorded via the CI workflow_dispatch.
- PR body: `**Human attention needed:** YES — auth (API keys, OAuth AS, device flow) + user-visible onboarding change`.

## Open risks

- Link sign-in only works where webapp auth is configured (`BETTER_AUTH_SECRET` + D1). Prelive and previews have auth off today, so there `/mcp` runs in dev passthrough. That matches the REST API, but it means unauthenticated writes to the `default` bucket on public preview URLs.
- Device-flow tokens are full Better Auth sessions (not scoped like API keys). Acceptable for v1; a scoped follow-up could mint an API key on approval instead.
- Agent config formats (Codex/Cursor/OpenCode/Gemini) drift. They live in one file (`domain/agents.ts`) so they are cheap to fix.
- Keys pasted into third-party agents end up in their storage. That is why chat apps get OAuth only, and why keys expire after 90 days.
