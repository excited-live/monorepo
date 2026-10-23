---
name: auth_better
description: >-
  Better Auth sign-in for apps/webapp (cookies mount) + apps/api (tokens mount)
  via packages/auth: middleware chain order, env config gate, the /api/auth/$
  catch-all, the /sign-in page, the page-level route guard, and its exact
  semantics. Use this skill when touching authentication, the middleware chain
  in start.ts, auth routes, the BETTER_AUTH_* env vars, sign-in/sign-out UI,
  the mobile bearer sign-in, or anything that must stay reachable signed out.
---

# Auth Better Skill (packages/auth: webapp cookies + api tokens)

The settled pattern replacing WorkOS AuthKit (PR for the WorkOS→Better Auth
migration, phases 2–4 of docs/plan-auth-migration.md; foundation is PR #99).
One auth package (`packages/auth`, `createAuth()` factory), one D1/SQLite
database, two mounts: `cookies` for the webapp (TanStack Start cookie
sessions), `tokens` for the api (bearer + apiKey + OAuth provider, no cookies).
Both mounts share user/session rows, so a token issued by one resolves in the
other.

## 1. Middleware chain (`apps/webapp/src/start.ts`)

Exact order in the start instance's `requestMiddleware` array:

1. `localeMiddleware`: resolves the request locale (the `i18n_platform` skill owns
   this; unchanged by auth).
2. `csrfMiddleware` (TanStack `createCsrfMiddleware`, filter `handlerType ===
   "serverFn"`): rejects cross-site requests to server-function RPC endpoints.
   Declaring our own start instance opts out of TanStack's built-in CSRF
   protection, so csrf is re-added EXPLICITLY here. It must run before the auth
   middleware so cross-site requests are rejected before any session work.
3. `betterAuthMiddleware` (ours): resolves the session via
   `getAuth().api.getSession({ headers })` and exposes
   `context.auth = { user }` (null signed out). Registered ONLY when
   `betterAuthConfigured()` is true.
4. `authGuardMiddleware` (the route gate, issue #46): redirects signed-out PAGE
   requests to `/sign-in?returnPathname=...` when auth is required. Registered
   ONLY when `betterAuthConfigured() && authRequired()`, and always AFTER
   betterAuthMiddleware so the session is already resolved.

The start callback re-runs per request, so the env checks inside it
(`betterAuthConfigured()` / `authRequired()`) are evaluated at request time and
work on workerd/Cloudflare Pages (where a module-load-time check would not).

## 2. Env config gate (`apps/webapp/src/lib/auth-config.ts`)

- `BETTER_AUTH_SECRET` — the ONLY required var. Min 32 chars; values in repo
  secrets / local `.env` only, never committed.
- `BETTER_AUTH_URL` — optional; leave unset to derive the origin per request
  (correct for PR preview deployments).
- `BETTER_AUTH_GOOGLE_CLIENT_ID` / `BETTER_AUTH_GOOGLE_CLIENT_SECRET` — optional
  Google social login; both must exist for it to wire up.
- `AUTH_REQUIRED` — the page-gate flag (renamed from WORKOS_REQUIRE_AUTH;
  enabling it in an environment is an env change, NOT a code change).
- `EXCITED_WEBAPP_AUTH_DB` — optional local dev SQLite path (default
  `.data/auth.sqlite` under apps/webapp).
- `EXCITED_API_URL` — optional MCP resource origin. Together with
  `BETTER_AUTH_URL` it turns on the authorization server (A2.1): the AS
  registers `<EXCITED_API_URL>/mcp` as the only resource/audience. When either
  is unset the OAuth and device plugins are not mounted and the rest of auth is
  unchanged. `BETTER_AUTH_URL` must be the public webapp origin when the AS is
  on (the issuer is derived from it; `/device` is built from it too).

- `betterAuthConfigured()`: true iff BETTER_AUTH_SECRET is set. When NOT
  configured it warns once per process and returns false, so unconfigured
  environments (PR previews, prelive, local mock work) keep running with normal
  rendering: the auth instance cannot be created without a secret, hence the
  gate.
- `authRequired()`: `betterAuthConfigured() && AUTH_REQUIRED is "true"/"1"`.
  The gate is production-only by env choice: previews, prelive, and local stay
  browsable because those environments leave the flag unset.

## 3. Instance + database (`apps/webapp/src/lib/auth.ts`)

`getAuth()` builds (and caches per isolate) the `cookies`-mount instance from
`@excited-live/auth`. Database resolution, in order: a `DB` D1 binding on
process.env (the Cloudflare Pages deploy path — bindings land on process.env
under nodejs_compat; must point at the SAME database as apps/api, see
apps/webapp/wrangler.toml), otherwise a local SQLite file via node:sqlite. The
binding lookup runs at request time (module-load time is too early on Pages).

## 4. Auth routes (`apps/webapp/src/routes/api/auth/$.tsx` + `/sign-in` page)

- `routes/api/auth/$.tsx`: the single catch-all every Better Auth endpoint goes
  through (sign-in/email, sign-up/email, sign-out, get-session, OAuth
  callbacks, …). GET + POST → `getAuth().handler(request)`. Replaces the three
  WorkOS routes (sign-in, callback, sign-out). Returns 503 (not 404) when auth
  is not configured.
- `routes/sign-in.tsx`: OUR OWN sign-in + create-account page (email/password +
  name for sign-up, Google when enabled) in the design system, `{ en, th }`
  strings via dictionaries.ts. Reachable signed out. `?returnPathname=/foo` is
  preserved through `validateSearch` and sanitized (must be a same-origin
  `/...` path) before navigating after auth. `?mode=signup` opens the
  create-account form directly; the in-page switch keeps the raw flow query.
  Both modes share `lib/auth-flow.ts` (`postAuthDestination`): an MCP OAuth
  authorization query is forwarded verbatim to
  `/api/auth/oauth2/authorize` (UI-only params such as `returnPathname`/`mode`
  stripped), otherwise the sanitized return path is used, so sign-up resumes
  the OAuth and device flows exactly like sign-in. Better Auth signs the new
  user in (cookie), then the page resumes. A signed-in visitor sees a
  "continue or sign out" card instead of the form; duplicate/invalid-email/
  weak-password errors map to dedicated strings. The client
  (`createAuthClient` from `@excited-live/auth`) posts to the handler on the
  same origin; the `tanstackStartCookies()` plugin (last in the plugin array,
  packages/auth) delegates Set-Cookie to the Start runtime.

## 5. The route guard (in start.ts, issue #46)

Page-level gate; registered per section 1. Behavior:

- Only intercepts `handlerType === "router"` (page/router requests).
  Server-function RPCs are intentionally NOT gated: `getAuthState`
  (routes/_layout.tsx) stays callable while signed out because the topbar reads
  it.
- `PUBLIC_AUTH_PATHS = { exact: Set(["/sign-in"]), prefix: "/api/auth/" }`:
  the sign-in page (exact) plus the Better Auth provider mount. Unlike the
  WorkOS exact-path set this prefix exemption is DELIBERATE: the whole
  /api/auth/ mount IS the auth provider surface by construction.
- Static file shapes pass through (missing /favicon.ico, robots.txt, and so on
  render their normal 404 instead of a sign-in bounce) via a STRICT extension
  allowlist `STATIC_FILE_EXTENSION_RE` (ico, png, jpg, jpeg, svg, webp, gif,
  css, js, woff/woff2, txt, xml, map), tested against the LAST path segment
  only. Deliberately strict: a dotted route segment like /user/john.doe must
  stay gated, so never widen this to "contains a dot".
- Reading the session: betterAuthMiddleware merges `{ auth: { user } }` into
  the downstream middleware context; the guard reads it by shape
  (`context?.auth` must be an object with a `user` key).
- Fail closed: if the auth context is missing (unreachable when registered
  correctly), the guard answers 503 "Auth is misconfigured" with cache-control
  no-store instead of silently disengaging the gate.
- Signed-out page request: 307 redirect to
  `/sign-in?returnPathname=<encodeURIComponent(pathname + search)>` with
  cache-control no-store, preserving the deep link.

## 6. Semantics to protect

- **The guard is a PAGE-LEVEL gate only.** Every server function that touches
  user data must check the session itself: the AUTH_REQUIRED flag does not
  cover server functions, by design (getAuthState must stay callable signed
  out). Pattern: call `getAuth().api.getSession({ headers: getRequestHeaders() })`
  and branch on the session. See `getAuthState` in `routes/_layout.tsx` and
  `lib/bff-proxy.ts` (BFF identity injection now ALSO forwards the session
  token as `Authorization: Bearer` so the api can pin identity from it).
- Do not weaken or widen the gate: the extension list stays strict, the 503
  fail-closed stays. A change here needs its own review.
- Never print, log, or commit secret values: env var NAMES only in code and
  docs, values only in env/repo secrets. This includes BETTER_AUTH_SECRET.

## 7. apps/api tokens mount (`apps/api/src/lib/auth.ts` + `src/routes/auth.ts`)

- `getTokensAuth(requestUrl, env)`: the `tokens`-mount instance (bearer +
  apiKey + OAuth provider). `baseURL` MUST carry the mount path
  (`<origin>/api/v1/auth`) — Better Auth derives its basePath from it, so the
  handler serves under our router instead of the default /api/auth. BETTER_AUTH_URL
  wins when set; otherwise the request origin is used and the cache is keyed on
  it. Null when BETTER_AUTH_SECRET is unset.
- `routes/auth.ts`: `GET /api/v1/auth/me` (bearer session check) + the
  `router.on(["GET","POST"], "*")` catch-all to `auth.handler(c.req.raw)`.
  Replaces the unsigned `biz_tok_` mock (killed per OQ-4).
- `createIdentityMiddleware()` (wired in app.ts on /api/v1/*, before the
  routers, skipping the /api/v1/auth/ prefix): auth configured → identity comes
  ONLY from a valid Bearer token; tokenless calls get 401 (the x-user-id trust
  hole is gone). Auth unconfigured → x-user-id passthrough (dev/prelive).
  The pinned id lands in `c.set("userId")`; `getUserId(c)` (lib/request.ts)
  reads it before the x-user-id fallback.
- Native apps (Excited.Biz mobile) sign in IN-APP: POST
  `/api/v1/auth/sign-in/email` with an `Authorization: Bearer` header → the
  session token comes back in the `set-auth-token` response header (bearer()
  plugin). No browser, no deep link. Token (never PII) is persisted client-side.
- Google sign-in on the same tokens mount uses the ID-token branch of
  `/api/v1/auth/sign-in/social` (`{ provider: "google", idToken: { token } }`),
  NOT the OAuth redirect: the Tauri app (tauri-plugin-google-auth, native
  Android/iOS Credential Manager flow) returns a Google ID token for the web
  client ID, better-auth verifies it server-side and the response body carries
  `token` (plus `set-auth-token` on the header). Requires
  `BETTER_AUTH_GOOGLE_CLIENT_ID`/`_SECRET` on the API and `VITE_GOOGLE_CLIENT_ID`
  (same web client ID) in apps/biz-mobile; Google Cloud needs an Android OAuth
  client for `live.excited.mobile` + the debug/release SHA-1.

## 7b. MCP authorization server (webapp) + resource server (API)

The sign-in link for modern agents is OAuth 2.1, with the WEBAPP as the
authorization server (it owns the sign-in UI and browser cookies) and `/mcp` on
the API as the protected resource.

- `createAuth({ oauth: { resource, deviceVerificationUri } })` (packages/auth)
  mounts `jwt()` + `oauthProvider()` + `deviceAuthorization()` on the cookies
  mount. `apps/webapp/src/lib/auth.ts` passes it only when `BETTER_AUTH_URL`
  and `EXCITED_API_URL` are both set.
- oauthProvider: DCR on (`allowDynamicClientRegistration` +
  `allowUnauthenticatedClientRegistration`), public PKCE clients, scopes
  `openid profile email offline_access onboarding accounting:read
  accounting:write`, grants `authorization_code` + `refresh_token` (no
  client_credentials). `resources` / `clientRegistrationDefaultResources` /
  `clientRegistrationAllowedResources` are all the MCP URL, so a requested
  RFC 8707 `resource` binds the JWT `aud` and every DCR client is linked.
  Access tokens are JWTs (EdDSA via the jwt plugin) — `aud` is present only
  because the client requests the resource (which MCP clients do).
- deviceAuthorization: public client id `excited-live-agent`,
  `verificationUri = <webapp>/device`; `/device/token` returns a first-party
  session token, NOT a JWT (accepted by the API's session-bearer branch).
- Endpoints (webapp origin, base path `/api/auth`): `POST /oauth2/register`,
  `GET /oauth2/authorize`, `POST /oauth2/consent`, `POST /oauth2/token`,
  `GET /jwks`, `GET /.well-known/oauth-authorization-server`,
  `GET /.well-known/openid-configuration`, plus `POST /device/code`,
  `GET /device?user_code=…`, `POST /device/approve|deny`,
  `POST /device/token`.
- Pages: `/sign-in` resumes a signed authorization query
  (`client_id` + `sig`) by forwarding the raw query back to
  `/api/auth/oauth2/authorize` after sign-in; `/consent` shows the client name
  and plain-language scopes and posts `{ accept, oauth_query }` to
  `/oauth2/consent`; `/device` prefills `user_code`, claims the code through
  `GET /device`, then approves/denies. `/consent` and `/device` are NOT added
  to `PUBLIC_AUTH_PATHS`: the guard bounces signed-out visits to `/sign-in`
  with `returnPathname`, which preserves the device code (no guard semantics
  changed).
- API resource server (`apps/api/src/lib/oauth.ts` + `modules/mcp/mcp.auth.ts`):
  `EXCITED_WEBAPP_URL` gates it. `GET /.well-known/oauth-protected-resource`
  and `/.well-known/oauth-protected-resource/mcp` return the resource, the AS
  issuer (`<EXCITED_WEBAPP_URL>/api/auth`) and `scopes_supported`.
  `resolvePrincipal` order: API key → OAuth JWT (remote JWKS + issuer +
  audience `<requestOrigin>/mcp` + expiry, scopes from `scope`, `onboarding` →
  `onboarding:read` + `onboarding:write`) → Better Auth session bearer → 401.
  The challenge URL and the metadata `resource` use `requestOrigin()`, which
  honours the API's `BETTER_AUTH_URL` behind proxies.

## 8. UI (`apps/webapp/src/components/TopbarAuth.tsx` + Topbar.tsx)

`TopbarAuth` receives `auth` (`{ configured, user: { firstName, email } | null }`)
and `returnPathname` from `_layout.tsx` (which server-calls `getAuthState()`
before render; better-auth's `user.name` maps to `firstName`). Renders NOTHING
when `!auth.configured` (previews, local mock), a sign-in link
(`t("auth.signIn")`) to `/sign-in?returnPathname=...` when signed out, and the
user's first name or email plus a sign-out link (`t("auth.signOut")`) when
signed in. Sign-out posts to the Better Auth handler client-side
(`authClient.signOut()`) and navigates back to `/`. Dictionary keys:
`auth.signIn`, `auth.signOut`, `auth.signInTitle`, `auth.email`,
`auth.password`, `auth.continueWithGoogle`, `auth.error.*`,
`auth.notConfigured` in `apps/webapp/src/lib/dictionaries.ts` (bilingual
{ en, th }, EN first, per the `i18n_platform` skill).

## 9. Commands

```bash
# Typecheck / lint the webapp (covers start.ts, auth-config.ts, auth.ts, routes)
pnpm --filter @excited-live/webapp typecheck
pnpm --filter @excited-live/webapp lint
# API tests: golden bearer tests in apps/api/src/routes/auth.test.ts
pnpm --filter @excited-live/api test
```

There is no auth-only test target: the webapp behavior is verified by typecheck
plus the integration facts above. Cheap local probe of the unconfigured path:
run the app without BETTER_AUTH_SECRET set and confirm the pages render
signed-out. A configured environment is verified by a sign-in round-trip
(prelive), not locally.

## 10. Pitfalls

- Never print or commit secret values. Env names only, values in the
  environment or repo secrets.
- Do not weaken or widen the gate: the extension allowlist stays strict, the
  503 fail-closed stays. Browsing "works better" with the guard disabled is
  the bug, not the fix.
- `tanstackStartCookies()` must stay LAST in the packages/auth plugin array
  (its after-hooks own the framework cookie store; plugins after it can drop
  Set-Cookie headers).
- The api mount's baseURL carries the mount path (/api/v1/auth). A bare origin
  baseURL makes every better-auth endpoint 404 (the handler serves /api/auth).
- Better Auth's schema check is version-pinned: `0003_auth.sql` is generated
  from the installed versions (`pnpm --filter @excited-live/auth gen:schema` +
  `pnpm --filter @excited-live/api gen:migrations`). A better-auth upgrade
  without regenerating fails with SCHEMA_MISMATCH at first request.
- Two db handles in dev/tests (api driver + auth instance) point at the same
  SQLite file: keep `DB_FILE_ENV` consistent (tests must call resetDbCache()
  so each temp file receives its migrations).
- When changing the auth flow itself, update this skill in the same PR instead
  of leaving drift.
