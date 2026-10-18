# excited.live

Financial simulation for your real life — tax, planning, and money decisions you can actually trust.
จำลองการเงินชีวิตส่วนตัว ที่คำนวณได้จริง เข้าใจได้ง่าย

## What is this?

Excited.live is a pnpm + turbo monorepo for building financial simulators:

- `apps/webapp` — the web app (TanStack Start + React 19, server-side rendered, deployed on Cloudflare Pages)
- `packages/*` — pure shared engines (no network, no DOM, no framework imports) so the same math can power the web app, mobile, MCP tools, and white-label builds later

The first engine, `packages/tax`, is done and tested: full Thai personal income tax 2026, plus a US 2026 placeholder. See [packages/tax/README.md](./packages/tax/README.md).

## Getting started

Requirements: Node 22 (what CI uses) and pnpm 10 (pinned via the `packageManager` field).

```bash
pnpm install
pnpm dev        # webapp on http://localhost:3000
pnpm build      # build all packages + app
pnpm typecheck  # typecheck everything
```

## Mock vs live API mode

`VITE_API_MODE` is a build-time environment variable used by the CI workflows:

- Every PR preview deploys twice: `<branch>-mock` (`VITE_API_MODE=mock`) and `<branch>-live` (`VITE_API_MODE=live`) on `*.excited-live.pages.dev`
- Pushes to `main` (prelive) and production deploys build with `VITE_API_MODE=live`
- For local dev, `mock` is the safe choice: stubbed data, no real keys, no real requests

## Deploy model

GitHub Actions builds the app and uploads directly to Cloudflare Pages (Cloudflare does not build — no build-count limit).

1. PR open/update → two preview deploys: `<branch>-mock` and `<branch>-live` on `*.excited-live.pages.dev`
2. Merge to `main` → automatically deployed to the prelive project: **https://excited-live-prelive.pages.dev**
3. Production (**https://app.excited.live** — the app's custom domain; root `excited.live` is the future marketing site) → manual trigger only: GitHub → Actions → Deploy Production → Run workflow → type PROD to confirm

Preview and prelive URLs are where you review changes; production only updates when someone runs the manual workflow.

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full guide and deployment pitfalls.

## For AI coding agents

Read [AGENTS.md](./AGENTS.md) before making changes — it covers the repo rules
(branch + PR flow, pure engine packages, bilingual `{ en, th }` strings), the
definition of done, and git safety for shared clones.

## Product requirements

[docs/PRD.md](./docs/PRD.md) is the **source of truth for product scope** —
split by phase: `prd-mvp.md` (Google Sheet MVP), `prd-mlp.md` (web app),
`prd-post-mlp.md` (backlog). Check the PRD before implementing any feature;
new ideas go into the PRD first.

## Contributing

- Never push straight to `main`. Branch from updated main as `feat/*`, `fix/*`, or `docs/*` and open a PR.
- `pnpm build` and `pnpm typecheck` must pass before opening a PR.
- Keep engines pure (no network, no DOM at module top level).
- New user-facing text is bilingual: `{ en, th }`, EN-first. (The web UI is EN-only today; this rule applies to everything added from now on.)

## License

[Apache-2.0](./LICENSE). Note: the license does not grant permission to use the excited.live trade names, trademarks, service marks, or product names (see LICENSE §6).
