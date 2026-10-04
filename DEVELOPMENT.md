# excited.live — Development Guide (for humans and agents)

Monorepo: pnpm + turbo. App lives in `apps/webapp` (TanStack Start + React 19, SSR). Tax engine in `packages/tax`.

## Commands

Run from repo root:

- Install: `pnpm install`
- Dev server: `pnpm dev` (webapp on :3000)
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Visual tests: `pnpm test:visual` (Playwright component screenshots)
- Update visual baselines: `pnpm test:visual:update`

## Visual regression tests

Playwright **component** tests (native `mount` fixture, `@playwright/test` only — no
`@playwright/experimental-ct`). Pinned to Playwright **1.63.0**.

Layout under `apps/webapp`:

- `playwright/gallery/index.html` + `playwright/gallery/main.tsx` — the gallery page that
  exposes `window.mount()` / `window.unmount()` and resolves stories by id via
  `import.meta.glob("../../src/**/*.story.{tsx,jsx}")`. A story id is the story file path
  plus the export name, e.g. `components/Topbar/Default`.
- `src/testing/TestScaffold.tsx` — wraps a story in the mastercard theme, the locale
  provider, and an in-memory TanStack router.
- `*.story.tsx` — one export per visual scenario (locale and auth variants live here).
- `*.spec.tsx` — `await mount("components/X/Y")` then `toHaveScreenshot`.
- `src/components/__snapshots__/` — committed baselines.

To cover a new component: add a `.story.tsx` next to it, then a `.spec.tsx` that mounts
each scenario. Run `pnpm test:visual:update` to write baselines, and commit the PNGs.

CI (`.github/workflows/screenshot-tests.yml`) runs these on every PR that touches
`apps/webapp/**` or `packages/design-system/**`. It pins
`mcr.microsoft.com/playwright:v1.63.0-noble` rather than `ubuntu-latest` on purpose —
baselines are pixel-compared, so they only reproduce on Playwright's reference image.
**If you bump the Playwright version, bump that image tag in the same commit** and
re-record the baselines.

## API modes (mock vs live)

Build-time switch via `VITE_API_MODE`:

- `VITE_API_MODE=mock` — stubbed data. Safe default for local dev: no real keys, no real requests.
- `VITE_API_MODE=live` — real backend. Used for the PR `live` preview and all main/production deploys.

## Deploy

GitHub Actions (`.github/workflows/`), direct-upload pattern (Cloudflare does NOT build — no build-count limit).

**Main webapp** (`apps/webapp` → Pages project `excited-live`):

- PR open/update → `preview.yml` → two preview deploys on project `excited-live`: `<sanitized-branch>-mock` and `<sanitized-branch>-live` aliases (`*.excited-live.pages.dev`). Branch names are sanitized first (lowercase, non-alphanumeric → `-`, dashes trimmed, max 23 chars so the suffix always fits Cloudflare's 28-char alias limit) — see the sanitize step in `.github/workflows/preview.yml`
- Merge/push to `main` → `prelive.yml` → auto-deploy to **prelive** project (`excited-live-prelive`, URL: excited-live-prelive.pages.dev → eventually prelive.excited.live)
- **Production** (`excited-live` project → **app.excited.live** custom domain) deploys ONLY via manual trigger: Actions → Deploy Production → Run workflow (requires typing PROD to confirm) (workflow_dispatch)

**Custom domain — the app lives on `app.excited.live`, NOT the apex (2026-09-06):** the root `excited.live` is reserved for the marketing/landing site; this webapp serves `https://app.excited.live`. One-time setup in the Cloudflare dashboard (Pages project `excited-live` → Custom domains → add `app.excited.live`; DNS is auto-managed since the zone is on the same account). WorkOS AuthKit production Redirect URIs must use the same origin: `https://app.excited.live/api/auth/callback`.

**Tax webapp** (`apps/tax-webapp` → Pages projects `excited-live-tax` + `excited-live-tax-prelive`): same 3-tier model via `tax-preview.yml` / `tax-prelive.yml` / `tax-production.yml` (paths-filtered to `apps/tax-webapp/**` and `packages/tax/**`, preview aliases on `*.excited-live-tax.pages.dev`). Tax previews are cleaned up by `tax-pr-cleanup.yml` and advertised in the PR body by `tax-pr-description.yml` — same shape as the main-app `pr-cleanup.yml` / `pr-description.yml`. The tax app imports `@excited-live/tax` (resolves to `packages/tax/dist`), so its CI builds with `pnpm exec turbo run build --filter=@excited-live/tax-webapp` (turbo builds the dependency chain first) instead of a bare in-app `pnpm build`.

Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (shared by both pipelines).

Note: the tax app has no backend yet (all computation is client-side), so its mock/live preview builds are currently identical; the `VITE_API_MODE` split exists for pipeline symmetry and matters once a backend lands.

Pitfalls:
- Must use wrangler@4 (v3 esbuild can't compile the SSR function — `with {type: json}` syntax)
- The Pages Functions (`apps/webapp/functions/[[path]].ts`, `apps/tax-webapp/functions/[[path]].ts`) bundle `dist/server/server.js` — deploy jobs must run inside the app dir where both `functions/` and `dist/` exist
- CF projects need `nodejs_compat` compatibility flag (set on all four projects: `excited-live`, `excited-live-prelive`, `excited-live-tax`, `excited-live-tax-prelive`)
- The branch-name sanitization algorithm now lives in FOUR copies that must stay in sync (preview.yml, tax-preview.yml, pr-cleanup.yml, tax-pr-cleanup.yml) plus the JS copy in each pr-description workflow — if you change one, change all

## Conventions for agents (Hermes)

**AI agents: read [AGENTS.md](./AGENTS.md) first** — it is the canonical agent
contract (rules, definition of done, git safety for shared clones). The notes
below are a quick summary.

- Work on a branch, open a PR. Never push straight to main.
- Before starting a task: `git pull --ff-only` on main, branch from it.
- Verify your work: `pnpm build`, `pnpm typecheck`, and `pnpm lint` must pass before opening the PR (CI enforces lint with zero warnings). If you touched a component in `apps/webapp/src/components`, run `pnpm test:visual` too.
- Keep the tax engine pure (no network, no DOM) — it lives in `packages/tax` and is shared.
- SSR: routes run server-side first; don't touch `window`/`document` at module top level.
- New user-facing text is bilingual: `{ en, th }`, EN-first. (The web UI is EN-only today; this rule applies to everything added from now on.)
