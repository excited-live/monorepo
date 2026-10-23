# PRD — Detailed Web App (`apps/webapp` MLP)

> **Parent**: [PRD.md](PRD.md) · **Prior phase**: [prd-mvp.md](prd-mvp.md) · **Mobile funnel entry**: [prd-biz-mobile.md](prd-biz-mobile.md) · **Next phase**: [prd-post-mlp.md](prd-post-mlp.md) · **Pricing**: [pricing.md](pricing.md)  
> **Strategic Role**: While the MCP server and [`apps/biz-mobile`](prd-biz-mobile.md) act as the top-of-funnel consumer entry points (pricing for agent access is an open question, see [PRD.md](PRD.md)), **`apps/webapp` is the detailed 50-year life simulation studio and primary revenue engine** ($109/year subscription after a 7-day free trial).

---

## 1. Overview

Turn the proven MVP math (`packages/sim` + `packages/tax`) and the user's daily financial reality from `packages/accounting` into a lovable, detailed web application where a new user has a working 50-year plan in 5 minutes (or imports their `biz-mobile` baseline in one click), sees their life story on one chart, explores scenarios with toggles and sliders, and lets **their own personal AI agent** (via MCP / API keys) inspect their plan and stage before/after proposals for human acceptance.

## 2. Goals

- **5-minute first run (or 1-click graduation from `biz-mobile`)** — a guided wizard (income → expenses → goals → retirement wish) produces a complete plan and lands on the chart, or pre-fills directly from the user's `biz-mobile` accounts.
- **One chart tells the life story** — net-worth / cash-flow trajectory across the full 50-year horizon with retirement year, goal milestones, shortfall years, and the Monte Carlo P10–P90 band on a single readable view.
- **Explore without fear** — scenario toggles ("Buy a condo", "Retire 5 years earlier", "Quit fulltime job for FromSukong") and live what-if sliders overlay against the baseline without overwriting it.
- **External Personal Agent Ready (BYOA First)** — open the plan & simulation engine via `/api/v1/*`, MCP, OpenAPI, and `llms.txt` using scoped Better Auth API keys (`compute`, `plan:read`, `plan:propose`). *Note: Built-in chat UI (`AssistantRail`) and autonomous agent workflows are deprioritized in favor of letting users connect their own AI agents first.*
- **Propose, never silently mutate long-term plans** — any structural 50-year plan change from an external AI agent or shared link arrives as a before/after diff with chart preview; the user clicks **Accept** on the web.
- **Bilingual EN/TH** — every label, helper, and chart annotation works in English and natural Thai.

## 3. User Stories

### Foundation (carries the MVP into the web app)

#### US-100: Saved plan per user `[shipped]`
**Description:** As a returning user, I want to sign in and come back to my saved plan on any device.  
**Acceptance Criteria:**
- [x] Sign-in via `packages/auth` (Better Auth on Cloudflare D1 — email/password + Google OAuth)
- [x] Plan input persists to Cloudflare D1 via `apps/api` (`/api/v1/plan`)
- [x] Opening the app loads the user's saved plan (or starts the wizard on first visit)
- [x] Export / import plan as JSON for backup and portability
- [x] Verify in browser

### The 5 Lovables (what makes it an MLP, not just a port)

#### US-101: 5-minute onboarding wizard `[shipped]`
**Description:** As a first-time user, I want to answer 4 short steps (income, expenses, goals, retirement wish) — or pull my existing numbers from `biz-mobile` — and immediately see my life-story chart, instead of facing a blank form of 20+ fields.  
**Acceptance Criteria:**
- [x] 4 steps: (1) monthly income + growth, (2) monthly expenses, (3) 1–3 big goals, (4) retirement age + monthly wish
- [x] Every step is skippable with sensible TH defaults
- [x] Finishing the wizard produces a complete `PlanInput` and lands directly on the life-story chart
- [x] Every wizard answer remains editable later in the full inputs view
- [x] Verify in browser

#### US-102: Life-story chart `[in progress — base chart + Monte Carlo band live; milestone markers next]`
**Description:** As a user, I want one hero chart that shows my 50-year net-worth and cash-flow trajectory with my retirement year, big goals, shortfall years, and Monte Carlo P10–P90 band marked on it.  
**Acceptance Criteria:**
- [x] Single hero chart switching cleanly between Net Worth and Cash Flow views
- [x] Monte Carlo P10 / P50 / P90 survival band rendered on the chart
- [ ] Vertical markers / callouts for retirement year, each big goal, and any shortfall year
- [ ] Hovering any year shows age, calendar year, income, expenses, portfolio, and milestones in plain language
- [ ] Verify in browser

#### US-103: Propose & accept plan diffs (Human-in-the-Loop Gate) `[planned]`
**Description:** As a user, when my personal AI agent (via MCP/API) or a shared scenario suggests a change to my 50-year plan, I want to see a clear before/after diff and its impact on my chart before I click Accept or Reject.  
**Acceptance Criteria:**
- [ ] Proposal card lists each changed field (`before → after`) in human terms
- [ ] Chart overlays the proposed trajectory against the current saved plan
- [ ] Summary delta shows impact on retirement readiness, survival rate, and shortfall years
- [ ] **Accept** applies the diff to the saved plan; **Reject** discards it cleanly
- [ ] Nothing mutates the saved 50-year plan without an explicit Accept click on the web
- [ ] Verify in browser

#### US-104: Scenario toggles `[planned]`
**Description:** As a user, I want to toggle named life scenarios ("Buy a condo", "Have a kid", "Retire 5 years earlier", "Go fulltime on my business") on and off and see the chart compare them against my baseline.  
**Acceptance Criteria:**
- [ ] Users can create, toggle, and delete named scenario overlays (stored as diffs on top of baseline)
- [ ] At least 3 preset TH starter templates ("Buy a condo", "Retire 5 years earlier", "Take a 1-year sabbatical")
- [ ] Toggling a scenario overlays its line on the life-story chart without overwriting the baseline plan
- [ ] Any scenario can be promoted to become the new baseline via the US-103 Accept flow
- [ ] Verify in browser

#### US-105: Live what-if sliders `[planned]`
**Description:** As a user, I want to drag sliders for retirement age, savings rate, expected return, and inflation and watch the chart respond in real time (< 100ms).  
**Acceptance Criteria:**
- [ ] Sliders for retirement age, monthly savings / expense level, portfolio return, and inflation
- [ ] Chart updates in < 100ms per drag tick using the in-memory `packages/sim` engine
- [ ] Includes a "Reset to saved" button and an "Apply changes" button (which routes through US-103 diff acceptance)
- [ ] Verify in browser

### Agent Surface (BYOA First; Built-in Assistant Deprioritized)

#### US-106: External Personal Agent Access (`MCP` + `API` + `llms.txt`) `[priority — promoted over built-in chat]`
**Description:** As a user who already works with my own AI agents (Claude Desktop, Cursor, ChatGPT, Hermes, custom bots), I want to give my agent a scoped key to read my `excited.live` state, run deterministic simulations, and stage plan proposals for me to review on the web.  
**Acceptance Criteria:**
- [ ] Scoped, revocable API keys in Settings via `packages/auth` (`compute`, `plan:read`, `plan:propose`, `biz:read`, `biz:write`)
- [ ] Stateless compute endpoints (`/api/v1/sim`, `/api/v1/tax`, `/api/v1/optimize`) + stateful plan/proposal endpoints (`/api/v1/plan`, `/api/v1/proposals`)
- [ ] Published `llms.txt`, OpenAPI 3.1 spec, and MCP server tools so external agents understand the schema with zero guesswork
- [ ] When an agent stages a proposal (`POST /api/v1/proposals`), it returns a deep link (`app.excited.live/proposals/:id`) that opens the US-103 visual diff review
- [ ] *Note: The in-app `AssistantRail` chat UI is kept as a secondary/optional surface and deprioritized until external agent connection and core flows are complete.*

### Bilingual & Quality Bar

#### US-107: Bilingual EN/TH experience `[shipped — continuous enforcement]`
**Description:** As a Thai or English user, I want to switch between EN and TH at any time and have every label, number format, and explanation feel native.  
**Acceptance Criteria:**
- [x] Every UI string lives in `packages/i18n` with `{ en, th }` (EN first)
- [x] Locale toggle in the top bar switches language without losing state
- [x] Thai copy uses natural spoken phrasing (no machine-translated stiffness)

### Monetization Gate (Detailed Web App = Primary Revenue Engine)

> Full pricing rules live in [pricing.md](pricing.md). B2B Advisor seats (US-109/US-110 from earlier drafts) are **deferred to Post-MLP backlog** so MLP stays 100% focused on the B2C consumer conversion loop.

#### US-108: 7-day trial & $109/year personal subscription `[planned]`
**Description:** As a user graduating from `biz-mobile` or the onboarding wizard, I want a 7-day free trial of the full `apps/webapp` planner and a clear $109/year subscription to keep my 50-year plan active afterwards.  
**Acceptance Criteria:**
- [ ] Finishing the wizard starts a 7-day trial with full access (no credit card required to run the wizard)
- [ ] Trial status and days remaining are visible in the app header/settings
- [ ] Checkout supports $109/year via Stripe (card + PromptPay)
- [ ] After trial expiry without a subscription, the user's saved plan remains safe and exportable as JSON (never held hostage), while interactive editing/simulation prompts to subscribe
- [ ] Verify in browser

## 4. Functional Requirements

- **FR-10**: `apps/webapp` calls `packages/sim`, `packages/tax`, and `packages/accounting` through a clean service layer (`plan-service.ts`) backed by `apps/api` (Hono + Cloudflare D1).
- **FR-11**: All long-term plan mutations from external AI agents or scenario promotions pass through a single proposal/diff reducer so US-103, US-104, US-105, and US-106 share one code path.
- **FR-12**: The onboarding wizard (US-101) is the default entry path for any user without a saved plan, with an option to seed from their `biz-mobile` account data.

## 5. Non-Goals (MLP)

- **No B2B Advisor workspace or client seats in MLP** (moved to [prd-post-mlp.md](prd-post-mlp.md) as second priority).
- **No heavy investment in a proprietary in-app AI chatbot before MCP/API** — users bring their own agents first.
- **No autonomous background agent workflows yet** — proactive agent routines (auto tax season alerts, scheduled plan check-ins) wait until after the core data + MCP connection is live.
- **No US tax in UI** (engine placeholder exists in `packages/tax`, stays hidden behind TH-only selector).
- **No brokerage / bank login credential scraping** (data enters via `biz-mobile` slip reading, wizard, manual edit, or agent API).

## 6. Resolved Decisions (Formerly Open Questions)

- **OQ-1 (Auth method) — RESOLVED**: Implemented via `packages/auth` (**Better Auth** on Cloudflare D1) supporting Email/Password, Google OAuth, Bearer tokens for mobile, and scoped API keys (`apiKey` plugin) for external agents. See [plan-auth-migration.md](plan-auth-migration.md).
- **OQ-6 (Chart library) — RESOLVED**: ECharts (`ProjectionChart`) renders the 50-year trajectory and Monte Carlo P10–P90 bands.
