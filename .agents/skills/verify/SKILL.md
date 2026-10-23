---
name: verify
description: >-
  Launch an isolated local excited.live stack (apps/api + the biz-mobile web app on the Vite dev server), drive it the
  way a user and their AI agent do (sign up, mint an agent key, call /mcp), and capture evidence.
  Use this skill to prove a user-facing change works before opening a PR, to reproduce a bug a user
  saw in the app, or whenever a change touches apps/api, /mcp, onboarding, or biz-mobile screens.
---

# Verify

Prove behavior on the real app, not on a proxy. Tests and typecheck say the code compiles and units agree; this skill says a user (and their agent) can actually do the thing.

Everything runs on its own ports with a throwaway database, so it never touches a developer's own `pnpm dev` or local data. Two worktrees can verify side by side when each picks its own ports.

---

## 1. Launch

From the repo root of your worktree:

```bash
pnpm install --frozen-lockfile          # a fresh worktree has no node_modules
.agents/skills/verify/scripts/stack.sh up
```

`up` builds the workspace packages the apps import (they resolve to `dist/`, turbo cache makes repeats instant), starts `apps/api` on `:8710` with SQLite at `.verify/api.sqlite`, starts the biz-mobile Vite dev server on `:1530` pointed at that API (dev-mode React, not a production bundle), waits until both answer, and prints `READY`. Ports: `VERIFY_API_PORT`, `VERIFY_MOBILE_PORT`. State: `VERIFY_RUN_DIR` (default `<repo>/.verify`, git-ignored).

It refuses to start when a port is taken by something it did not start. Pick other ports; never kill a process you did not launch.

## 2. Doctor

```bash
.agents/skills/verify/scripts/stack.sh doctor
```

Healthy means: both pids alive, `GET /health` → 200, `GET /api/v1/settings` without a token → **401** (auth is on), biz-mobile `/` → 200. Run it first whenever a journey fails strangely. Logs live in `.verify/logs/{api,mobile,build}.log`.

## 3. Drive

```bash
node .agents/skills/verify/scripts/drive.mjs <journey> [--snapshot]
```

Each run signs up a brand-new user through the real sign-in form, so journeys never share state. Journeys and what they prove are in [features/README.md](features/README.md). Exit code 0 means PASS.

Adding a journey: add a function to `JOURNEYS` in `drive.mjs` and a file under `features/`. Find selectors with `--snapshot`, which prints the page's accessibility tree; prefer roles and visible labels (`getByRole("button", { name: "Generate key" })`) over CSS or coordinates. English labels are the default locale.

To act as the user's agent, use the `mcp(key, method, params)` helper: JSON-RPC over `POST /mcp` with the agent key, exactly what Claude Code or Hermes sends.

## 4. Evidence

Every run writes `.verify/evidence/<timestamp>-<journey>/` with `final.png` (full-page, 390px mobile viewport) and `evidence.json` (each assertion's observed value, browser console errors, final URL). Look at the screenshot before trusting a FAIL or a PASS: a wrong selector looks like an app bug.

Proof standards:
- Drive the real user path (the sign-in form, the Generate key button), never a test-only endpoint.
- Check a side effect as well as the screen: an authenticated API call, an MCP call, a row the agent created showing up for the human.
- A journey that fails because seed data is missing is a FAIL with the reason written into that feature's Gotchas. Never weaken the journey to pass.
- Quote the PASS line and evidence path in the PR's Verification notes.

## 5. Cleanup

```bash
.agents/skills/verify/scripts/stack.sh down
```

Stops exactly the process groups `up` started (each pid file also records the start time, so a recycled pid is never signalled) and deletes the throwaway database. It warns if a port is still in use afterwards. Needs `ss` (iproute2), so Linux. Evidence stays in `.verify/evidence/`.

## Not covered yet

- `apps/webapp` (TanStack Start on `:3000`). Its Playwright component tests (`pnpm test:visual`) cover components, not journeys.
- The Tauri native shell (Android, iOS). This drives the same React app in Chromium; native-only paths (Google sign-in, share sheet, `TAURI_DEV_HOST`) need a device or emulator.
- Deployed environments. The API is on prelive (`https://excited-live-api-prelive.preamza02.workers.dev`), but `drive.mjs` only targets localhost and prelive sign-up hangs today (#158). Once #158 is fixed, add a URL override so the same journeys run against prelive.
