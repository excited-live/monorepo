# excited.live Mobile (`biz-mobile`) — PRD, Mobile Architecture & UI Specification

> **Status**: Ship Priority #1 — Active Top-of-Funnel Consumer App (Updated 2026-10-17)  
> **Target Package**: [`apps/biz-mobile`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/apps/biz-mobile)  
> **Core Engine**: [`packages/accounting`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/packages/accounting) (`@excited-live/accounting` pure TypeScript math & command engine)  
> **API & Agent Surface**: [`apps/api/src/modules/accounting/`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/apps/api/src/modules/accounting/) (`/api/v1/accounting` hexagonal module + MCP tools)  
> **Design Tokens**: Canonical Mastercard Design System ([`DESIGN.md`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/DESIGN.md) & [`@excited-live/design-system`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/packages/design-system))  
> **Native Framework**: Tauri v2 Mobile (Android first, iOS ready — identical pattern to [`apps/tax-mobile`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/apps/tax-mobile))

---

## 1. Executive Summary & Strategic Role in the OS

**`excited.live` Mobile (`apps/biz-mobile`) is our #1 shipping priority and the primary consumer entry point into the `excited.live` Agentic OS.**

It is a luxury, local-first + cloud-synced mobile spend, slip-capture, revenue, and asset depreciation companion designed for individuals, creators, and solopreneurs managing both personal finances and multiple ventures.

### Strategic Funnel Role
1. **Do One Simple Job Effortlessly on Mobile (Free Top-of-Funnel)**: Help users know their exact cash reserve, monthly burn, hardware depreciation, and daily slip spend in seconds.
2. **Proactive Data Capture (MeowJot / เหมียวจด Style)**: Eliminate manual bookkeeping friction by reading Thai bank transfer e-slips (via OS Share Sheet, gallery scan, or personal AI agent) and turning them into structured ledger entries automatically.
3. **Agent-First Open Access (`API` + `MCP`)**: Everything captured in `biz-mobile` syncs to `/api/v1/accounting` so the user's external personal AI agents (Claude, ChatGPT, Hermes, LINE/Telegram bots) can query burn/runway or log transactions on their behalf.
4. **Channel Users to the Detailed Web Planner (`apps/webapp`)**: Once users love tracking their present cashflow and runway on mobile, we channel them into the paid detailed web application (`apps/webapp`) to simulate the next 50 years of their life—carrying their `accounting` numbers straight into their long-term plan.
5. **Foundation for the Time Management Pillar**: Because `biz-mobile` already maps the user's career (`fulltime_job`), ventures (`business`), commute (`BTS`), and recurring activities, attaching weekly hours to these exact entities powers the upcoming Time Management planner with zero cold-start setup.

### The Problem
Traditional accounting software (FlowAccount, ERPNext, QuickBooks) is bloated with compliance overhead (tax invoices, VAT filing, WHT certificates, general ledgers) that personal creators and solo founders do not need for day-to-day burn awareness. Meanwhile, basic slip-tracking bots (like MeowJot on LINE) trap data inside chat threads without modeling recurring burn, hardware depreciation, multi-entity business runways, or open MCP access for the user's own AI agents.

### The Solution: Multi-Entity Solopreneur Engine + Slip Capture
**`excited.live` launches directly as a native mobile application (`apps/biz-mobile` powered by Tauri v2 and React 19)** backed by `/api/v1/accounting`. It models:
1. **Personal**: Core living cash reserve (asset-derived treasury), recurring subscriptions, daily slip expenses, hardware register, and burn runway.
2. **Fulltime Job (Career Card)**: Salary/cashflow stream with an **"UNTIL"** countdown metric (days until next payday + months until solopreneur freedom buffer) instead of a burn runway.
3. **Business (Multi-Business Support)**: Multiple independent side-hustles/ventures (e.g. `FromSukong`), each with its own cash reserve, revenue stream, SaaS subscriptions, hardware register, and independent runway.
4. **Capital Injection**: Instant transfer from Personal to any Business entity, immediately reflecting on both entities' cash reserves and runway calculations.

---

## 2. Core Baseline Targets (Verifiable Seed Data)

The engine and UI must reproduce the verified baseline numbers from Prame's live setup:

### A. Recurring Subscriptions & Regular Bills
| Item | Cycle | Amount (THB) | Monthly Equivalent | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **BTS SkyTrain** | Monthly | ฿1,400.00 | ฿1,400.00 | Transit pass |
| **AIS Fibre** | Monthly | ฿540.00 | ฿540.00 | Home internet |
| **Opencode Go** | Monthly | ฿360.00 | ฿360.00 | Dev tool |
| **Mobile Internet** | Monthly | ฿170.00 | ฿170.00 | Cellular plan |
| **Make (Integromat)** | Monthly | ฿57.50 | ฿57.50 | Automation |
| **Domain Name** | Yearly | ฿360.00 | ฿30.00 | ฿30/mo amortised |
| **Phone Line** | Monthly | ฿20.00 | ฿20.00 | Backup SIM |
| **Total Recurring** | — | — | **฿2,577.50 / mo** | Baseline Target |

### B. Owned Gear & Straight-Line Depreciation Register
Straight-line formula: $\text{Depreciation/mo} = \frac{\text{Purchase Price} - \text{Salvage (0)}}{\text{Lifespan Months}}$  
Items fully depreciated floor at ฿0.

| Device / Hardware | Cost (THB) | Lifespan | Purchase Date | Monthly Rate | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Workstation PC** | ฿30,000 | 5 yrs (60 mo) | Historical | ฿0.00 | **Fully depreciated** (฿0) |
| **iPad Gen 9** | ฿10,900 | 5 yrs (60 mo) | 2021-09 | ฿181.67 | Finishes Oct 2026 → ฿0 in Nov |
| **Nothing Phone 2a** | ฿10,000 | 5 yrs (60 mo) | 2024-03 | ฿166.67 | Active |
| **SoundCore Space 1** | ฿2,800 | 3 yrs (36 mo) | 2024-03 | ฿77.78 | Active |
| **SoundCore Open-Ear**| ฿1,000 | 3 yrs (36 mo) | 2026-05 | ฿27.78 | Active |
| **Amazfit Active Edge**| ฿3,000 | 3 yrs (36 mo) | 2025-08 | ฿83.33 | Active |
| **Total Depreciation** | — | — | — | **≈ ฿537.23 / mo** | Drops to **≈ ฿355.56** in Nov 2026 |

### C. Unified Headline Burn
- **October 2026 Baseline**: ฿2,577.50 (recurring) + ฿537.23 (depreciation) = **≈ ฿3,114.73 / month**
- **November 2026 Run-rate**: ฿2,577.50 (recurring) + ฿355.56 (depreciation) = **≈ ฿2,933.06 / month**

---

## 3. Visual & Mobile Ergonomics Specification

The mobile UI follows the luxury, paper-like minimalism of the **Mastercard Design System** and ergonomic mobile benchmarks (Google Pay hero wallet / Revolut / `apps/tax-mobile`):

### 3.1 Design Tokens
- **Canvas Cream (`#F3F0EE`)**: Page background, zero harsh digital white, zero neon gradients.
- **Lifted Cream (`#FCFBFA`)**: Elevated cards with authentic paper-on-paper depth.
- **Ink Black (`#141413`)**: Primary typography and high-contrast hero balance card.
- **Signal Orange (`#CF4500` / `#F37338`)**: Single brand focus accent for dots, primary indicators, and active badges.
- **Border Subtle (`rgba(20, 20, 19, 0.08)`)**: Crisp 1px hairline dividers.

### 3.2 Mobile Information Architecture & Screen Flow

```mermaid
graph TD
    AppLaunch[Mobile App Launch] --> AccountSelector[Top Account Switcher: Personal / Fulltime Job / FromSukong / + Add]
    
    AccountSelector --> HeroCard[Google Pay Style Ink Black Hero Card]
    HeroCard -->|Personal / Business| RunwayView[Cash Left + Runway in Months + Monthly Net Burn]
    HeroCard -->|Fulltime Job| UntilView[Monthly Salary + UNTIL Payday / Freedom Target]
    
    HeroCard --> QuickShortcuts[Action Squircles: Scan Slip / + Expense / Inject Biz / + Gear]
    
    QuickShortcuts -->|Scan Slip| SlipCaptureSheet[MeowJot-Style Thai Bank Slip Reader & Auto-Categorizer]
    QuickShortcuts -->|+ Expense| AddCostSheet[Slide-Up Add Expense Drawer]
    QuickShortcuts -->|Inject Biz| CapitalTransferSheet[Slide-Up Transfer from Personal to Business]
    QuickShortcuts -->|+ Gear| AddGearSheet[Slide-Up Add Hardware Asset Drawer]
    
    subgraph Persistent Dock (Zero Heavy Charts)
        BottomDock[Floating Minimalist Bottom Dock: Home / Capital / Ledger / Settings]
    end
```

---

## 4. User Stories & Acceptance Criteria

### US-BIZ-001: Mobile Recurring Subscriptions Tracker `[shipped]`
**Description:** As a user on my phone, I want to view, add, and manage my regular bills and software subscriptions in under 30 seconds.  
**Acceptance Criteria:**
- [x] Add/Edit modal drawer with auto-focusing `MoneyInput` (caret preserved, native numeric keypad).
- [x] Billing cycles supported: `Weekly`, `Monthly`, `Quarterly`, `Semi-Annual`, `Yearly`.
- [x] Auto-calculation of normalized monthly cost ($\text{cycle} \to \text{monthly}$).
- [x] Next charge date selector with pre-computed "days until renewal".
- [x] Overdue or imminent charges ($\le 7$ days) highlighted with Signal Orange badges.
- [x] Soft deletion: Cancelled subscriptions remain in history with active spend set to ฿0.

### US-BIZ-002: Gear & Straight-Line Depreciation Register `[shipped]`
**Description:** As a user, I want my physical tech devices tracked with straight-line depreciation so my equipment costs appear as a transparent monthly burn rather than sporadic lump sums.  
**Acceptance Criteria:**
- [x] Add asset modal: name, purchase price, purchase month, useful lifespan (months or years), category, account ID.
- [x] Automatic straight-line calculation: $\text{monthly} = \frac{\text{price}}{\text{lifespan}}$.
- [x] Automatic elapsed-months computation clamped to lifespan.
- [x] When elapsed months $\ge$ lifespan, status flags `isFullyDepreciated: true` and monthly contribution becomes ฿0.00.
- [x] Displays remaining book value: $\max(0, \text{price} - \text{elapsed} \times \text{monthly})$.
- [x] Reproduces iPad depreciation dropping off at month 60 (Nov 2026).

### US-BIZ-003: Headline Burn & Dual-Perspective Outflow `[shipped]`
**Description:** As a user, I want to toggle between cash outflow and smoothed run-rate so I can plan both cash flow and long-term spending.  
**Acceptance Criteria:**
- [x] **Smoothed View (Default)**: Normalizes annual/quarterly costs into a 1/12 monthly average plus monthly depreciation.
- [x] **Cash View**: Shows only subscriptions and bills whose renewal dates fall inside the current active calendar month, plus monthly depreciation.
- [x] View selection persists across app launches via local storage.

### US-BIZ-004: Multi-Entity Solopreneur Architecture & Accounts `[shipped]`
**Description:** As an independent creator, I want to separate my personal living expenses, my day job salary, and multiple businesses/side-hustles without having to manage separate apps.  
**Acceptance Criteria:**
- [x] Support distinct entity contexts: `personal` (with optional Career/Fulltime Job card) and multiple `business` entities (`FromSukong`, `excited.live`, etc.).
- [x] Top bar switcher switches between entities seamlessly with an option to `+ Add Business`.

### US-BIZ-005: Capital Transfer / Seed Injections `[shipped]`
**Description:** As a founder, I want to transfer capital from my Personal reserve into my Business, and see the immediate impact on both runways.  
**Acceptance Criteria:**
- [x] Capital transfer drawer allows specifying source account (`Personal`), target business, and amount.
- [x] Live preview displays: Personal runway impact and Business runway extension.
- [x] Transaction log tracks capital injections chronologically.

### US-BIZ-006: Fulltime Job "UNTIL" Metric & Income Streams `[shipped]`
**Description:** As a side-hustler with a day job, I want my salary tracked with an "UNTIL" countdown rather than an irrelevant burn runway.  
**Acceptance Criteria:**
- [x] Fulltime Job / Career card shows monthly salary amount and **"UNTIL"** metrics:
  - Days until next payday (e.g. `14 Days until Payday: ฿75,000`).
  - Target solopreneur freedom milestone (e.g. `Until Target Runway: 6 Months`).
- [x] Business accounts support Revenue/Income entry.
- [x] Net Burn calculation: $\text{Net Burn} = \text{OpEx} + \text{Depreciation} - \text{Revenue}$. If positive net cashflow, flags as `Default Alive`.

### US-BIZ-007: Pure Math Package & Verification Gate `[shipped]`
**Description:** As an engineer, I want all financial computations encapsulated in a zero-dependency pure TypeScript package verified by golden tests and an independent Python script.  
**Acceptance Criteria:**
- [x] Package [`packages/biz`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/packages/biz) contains zero DOM, zero network, and zero UI dependencies.
- [x] Golden unit test suite validates exact baseline numbers: ฿2,577.50 / ฿537.23 / ฿3,114.73.
- [x] Python independent validation script [`scripts/recompute-biz.py`](file:///home/prame/.t3/worktrees/excited.live/t3-f65d84f8/scripts/recompute-biz.py) calculates identical outputs to 2 decimal places.

### US-BIZ-008: First-Run Onboarding Journey `[planned]`
**Description:** As a new user opening `excited.live` for the first time, I want to replace the example data with my own in under three minutes so the hero card shows my cash and my runway, not someone else's numbers. Flows: F-50 to F-55 in [prd-flows.md](prd-flows.md).  
**Acceptance Criteria:**
- [ ] Fresh install opens with labeled example data and a start affordance; the example state is never presented as the user's own data.
- [ ] One screen picks the first entity: personal, fulltime job, or business, with starting cash (or salary + payday for fulltime job).
- [ ] Recurring bills capture supports up to six common TH rows plus a custom slot, each skippable, with live monthly equivalent.
- [ ] Gear capture is optional and skippable; skipping leaves the hardware register empty with its add affordance.
- [ ] On finish, onboarding data replaces the example state and Home shows the hero card with the user's numbers.
- [ ] A get-started checklist card tracks anything skipped (add gear, add a business, sign in) and dismisses when done.
- [ ] Sign-in is offered after data entry, never before, and never blocks the local-first path.
- [ ] All onboarding copy is bilingual `{ en, th }`, EN first.

### US-BIZ-009: Proactive Thai Bank Slip Reading (MeowJot / เหมียวจด Style) `[planned — Priority Next]`
**Description:** As a Thai user who pays for almost everything via PromptPay QR / bank transfer, I want `excited.live` to read my bank transfer e-slips automatically (from my phone's share sheet, slip album, or via my personal AI agent) so my spending is recorded without manual typing.  
**Acceptance Criteria:**
- [ ] **Slip Ingestion Channels**:
  1. **In-App & OS Share Target**: Share an e-slip image from K Plus / SCB EASY / Krungthai NEXT / Bangkok Bank directly to `excited.live` or pick from the device's bank-slip folder.
  2. **API / MCP Endpoint (`POST /api/v1/accounting/slips`)**: External personal agents can submit either a raw slip image/payload or pre-extracted slip fields.
- [ ] **Deterministic QR + OCR Extraction**:
  - Parses Thai EMVCo / Bank of Thailand mini-QR payload on the slip for tamper-proof `transactionRef` (deduplication key) and bank code, paired with vision/OCR extraction for `amount`, `timestamp`, `sender`, `recipientName`, and `memo`.
  - Duplicate uploads of the same `transactionRef` are idempotently ignored.
- [ ] **Smart Classification (No Double-Counting)**:
  - **Recurring Match**: If a slip matches an active `RecurringSubscription` (e.g., ฿540 to AIS), it marks that month's bill as paid and advances `nextRenewalDate` instead of double-counting burn.
  - **One-Off Variable Spend**: Otherwise logs as a `SlipTransaction` (`outflow` or `inflow`) under the target entity (`personal` or `business`) with auto-suggested category (`food`, `transit`, `software`, `gear`, `other`).
  - **Promote to Gear / Recurring / Capital Transfer**: One tap in the review drawer converts a slip into a depreciated `HardwareAsset`, a new `RecurringSubscription`, or an inter-entity `CapitalTransfer`.

### US-BIZ-010: External Personal Agent & MCP Access (BYOA First) `[in progress — REST live, MCP/Scoped Keys next]`
**Description:** As a user living in the agentic era, I want my own AI agent (Claude, ChatGPT, Hermes, custom Telegram/LINE bot) to read my `accounting` accounts, log slips/expenses, and answer runway questions on my behalf without waiting for an in-app chatbot.  
**Acceptance Criteria:**
- [x] REST endpoints live at `/api/v1/accounting` (`GET /snapshot`, `PUT /snapshot`, `/accounts`, `/expenses`, `/assets`, `/incomes`, `/liabilities`, `/transfers`, `/ledger/:yearMonth`).
- [ ] **Scoped API Keys (`packages/auth`)**: Users can generate a revocable API key in Settings with granular scopes (`biz:read`, `biz:write`, `slip:write`).
- [ ] **MCP Server & OpenAPI Spec**: Expose tools (`get_runway_summary`, `list_upcoming_bills`, `record_slip_transaction`, `add_subscription`, `simulate_capital_transfer`) so any MCP-compatible agent connects in one step.
- [ ] **Audit Tagging**: Agent-created entries record `source: "agent"` in the monthly ledger with one-tap undo.

### US-BIZ-011: Graduation Bridge to Detailed Web Planner (`apps/webapp`) `[planned]`
**Description:** As a `biz-mobile` user who has tracked my personal burn, salary, and business cashflow, I want to open the detailed 50-year web planner (`apps/webapp`) with my real numbers pre-populated so I don't have to re-enter my financial life.  
**Acceptance Criteria:**
- [ ] Subtle "Simulate your 50-year life plan →" card in `biz-mobile` Forecast / Settings.
- [ ] Maps `accounting` state into `packages/sim` `PlanInput`: Career salary + net business revenue → `Income` period rows; Personal smoothed burn → `Expenses` rows; Personal + Business cash reserves → initial wallet balances.
- [ ] Prompts the user to start their **7-day free trial** of the $109/year `apps/webapp` planner.

---

## 5. Technical Architecture & Workspace Placement

```
excited.live/
├── apps/
│   ├── biz-mobile/               # Day One Native Mobile App (Tauri v2 + Vite + React 19)
│   │   ├── src/                  # Clean Architecture screens, Astryx UI, Mastercard theme
│   │   ├── src/service/          # Type-safe Hono RPC & TanStack Query service layer
│   │   ├── src-tauri/            # Rust native wrapper, Android / iOS manifest, permissions
│   │   └── package.json          # @excited-live/biz-mobile
│   ├── api/                      # Hono BFF on Cloudflare Workers + D1
│   │   └── src/modules/accounting/ # Hexagonal /api/v1/accounting (route, service, domain, repo)
│   └── tax-mobile/               # Reference Tauri v2 mobile app
├── packages/
│   ├── accounting/               # Pure Accounting Math, Commands & Wealth Engine (@excited-live/accounting)
│   │   ├── src/                  # types, wealth.ts, commands/, catalog.ts
│   │   └── tests/                # Verification suites
│   ├── auth/                     # Better Auth (Bearer tokens for mobile + API Keys for agents)
│   └── design-system/            # Mastercard Design System & Astryx components
```

---

## 6. Non-Goals (Strictly Out of Scope for `biz-mobile`)
- ❌ **No Heavy Multi-Decade Mobile Charts**: Zero fussy 50-year SVGs on mobile. Deep 50-year projection charts and Monte Carlo bands live in `apps/webapp` (the paid graduation surface).
- ❌ **No Built-in Chat Assistant Bloat on Mobile**: We prioritize open API/MCP access for the user's own agents and proactive slip scanning over embedding a chat window on a phone screen.
- ❌ **No Corporate Tax Compliance & Accounting Books**: No VAT 7% filing, e-Tax invoices, 50 Tawi certificates, or general ledger.
- ❌ **No Direct Bank Credential Scraping**: Slip reading uses user-shared e-slips / QR payloads—zero bank password sharing required.
