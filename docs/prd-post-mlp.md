# PRD — Post-MLP Expansion Roadmap (Time OS, Health OS, Agent Workflows & Backlog)

> **Parent**: [PRD.md](PRD.md) · **Prior phase**: [prd-biz-mobile.md](prd-biz-mobile.md) & [prd-mlp.md](prd-mlp.md) · **Pricing**: [pricing.md](pricing.md)  
> Items here are sequenced by **business & product triggers** along the `excited.live` Agentic OS horizon: **Money → Time → Health**.

---

## 1. Pillar 2: Time Management OS (`packages/time` + Mobile/Web Views)

- **Trigger**: `apps/biz-mobile` (with slip reading + recurring burn) and `apps/webapp` are live and retaining active users on the Money graph.
- **Core Insight (Zero Cold-Start)**: We already know **what the user spends money on** (`RecurringSubscription`, `SlipTransaction`), **where they live and commute** (e.g., rent, BTS SkyTrain), and **what jobs or ventures they run** (`fulltime_job`, `business` entities like `FromSukong`). We do not ask the user to build a time tracker from a blank page—we simply ask **how many hours per week/day they spend on those existing activities**.
- **Scope**:
  - **Activity-Duration Attachment**: Attach `hoursPerWeek` (or daily time logs via mobile/MCP) directly to `EntityAccount` (`fulltime_job` work hours + commute hours, `business` deep-work hours) and `RecurringSubscription` / `SlipTransaction` categories (gaming, gym, entertainment, commute).
  - **True Net Hourly Wage Engine**: Computes the user's real take-home pay per actual hour of life energy:
    $$\text{True Hourly Rate} = \frac{\text{After-Tax Income} - \text{Work/Commute Expenses} - \text{Work Gear Depreciation}}{\text{Work Hours} + \text{Commute/Overhead Hours}}$$
  - **168-Hour Weekly Ledger & Time Runway**: Shows committed vs. discretionary hours across the 168-hour week, and projects lifetime free hours alongside financial retirement in `apps/webapp`.
  - **Mobile Pro Tier Unlock**: Launches the **Money + Time Mobile Pro Plan** once both pillars operate together.

---

## 2. Pillar 3: Health & Energy OS — Competing with Cal AI (`packages/health`)

- **Trigger**: Money + Time ecosystem is active; multimodal ingestion pipeline (built for Thai e-slips in `biz-mobile`) is proven in production.
- **Core Insight**: Just as users snap/share a bank slip to log money (`MeowJot` pattern), they snap a photo of their meal to log nutrition (`Cal AI` pattern)—unified under the same personal AI agent and cross-platform account.
- **Scope**:
  - **Cal AI-Style Multimodal Food & Macro Logging**: Snap a photo of a meal (in-app or via the user's personal AI agent over MCP/API) → vision pipeline extracts dish breakdown, calories, protein/carbs/fat, and links food spend if paired with a slip.
  - **Cross-Platform Biometric & Habit Sync**: Sync weight, sleep, steps, and workouts across Android/iOS/web and expose them via `/api/v1/health` + MCP.
  - **Unified Money × Time × Health Graph**: Allows the user and their personal agent to reason across all three life constraints simultaneously (e.g., *"How much money and time am I spending on takeout vs. cooking, and how is it affecting my calorie target and runway?"*).
  - **Full OS Pro Lock-in**: Completes the 3-pillar consumer subscription lock-in (`Money + Time + Health`).

---

## 3. Proactive Agent Workflows (Post-Connection Phase)

- **Trigger**: External Personal Agent connection (`/api/v1/*` + MCP + slip ingestion) is adopted by users.
- **Why Sequenced Here**: In Phase 1–2, "proactive" means frictionless **data capture** (e-slips + open MCP tools). Once the user's financial and time data flows reliably, we layer on **automated agent workflows**:
  - **Q4 Tax Optimizer Check-in**: Proactively computes remaining ThaiESG / RMF / insurance allowance before Dec 31 based on actual year-to-date income and stages a one-click proposal diff.
  - **Monthly Burn & Depreciation Digest**: Summarizes actual slip spend vs. planned recurring burn, flags subscriptions that increased in price, and announces gear finishing depreciation.
  - **Built-in Assistant (`AssistantRail`)**: Re-prioritize the hosted in-app assistant for users who do not bring their own external agent.

---

## 4. Deeper Financial Engine Capabilities

### 4.1 Real Exit-Tax Modeling
- **Trigger**: First user holding tax-advantaged funds (`ThaiESG` / `RMF`) asks *"What if I sell early or rebalance?"*
- **Scope**: Track cost basis and holding-period rules per lot (5-year lock for ThaiESG; age 55 + 5 years for RMF) and model early-redemption clawbacks.

### 4.2 Per-Goal Dedicated Wallets
- **Trigger**: Users report the 3-wallet model (`Savings`, `Investment`, `Retirement`) is too coarse for ring-fenced goals (e.g., child's tuition fund).
- **Scope**: Optional goal-attached sub-wallets with target-date glidepaths.

### 4.3 US Personal Tax & Corporate Tax Engines
- **Trigger**: First English-speaking expat cohort (US tax) or solopreneur incorporating as a Thai Co., Ltd. (Corporate tax).
- **Scope**:
  - Replace the flagged US 2026 placeholder in `packages/tax` with verified federal brackets, standard deductions, and 401(k)/IRA rules.
  - Add Thai SME corporate tax + dividend withholding comparison (`Personal Freelance vs. Co., Ltd.`) for `biz-mobile` / `webapp` users scaling their business revenue.

---

## 5. Deferred Priority 2: B2B Advisor Tier & White-Label

- **Trigger**: Consumer (B2C) flywheel across `biz-mobile` and `webapp` reaches stable recurring revenue, and independent financial advisors organically request multi-client management.
- **Why Deferred**: We are going **all-in on the consumer side first**. Provider-side monetization starts with lightweight **contextual affiliates/sponsorships**, not B2B SaaS sales.
- **Scope (When Triggered)**:
  - **Advisor Workspace ($59/mo or $599/yr)**: Manage up to 5 active client plans + unlimited 30-day client trial seats, with shared proposal links and advisor BYOK / credit packs.
  - **Enterprise White-Label**: Custom domain, logo, and brand tokens for advisory firms.
