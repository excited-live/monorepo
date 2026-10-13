# excited.live Mobile — Wireframe Design Specification (Global Entity Context & Monthly Ledger)

## 1. Unified Mental Model: Strict Global Entity Context

There are **zero in-page filter pills**. The active account selected at the top sets the **single global context** across the entire application (Home, Capital, Monthly Ledger).

```
   ┌────────────────────────────────────────────────────────┐
   │ GLOBAL CONTEXT SWITCHER:                               │
   │ [ 👤 Personal ▾ ] | [ 💼 Fulltime Job ] | [ 🚀 FromSukong ] | [ ＋ Add ]
   └───────────────────────────┬────────────────────────────┘
                               │
             Applies to ALL tabs automatically (No Filter Pills)
                               │
     ┌─────────────────┬───────┴─────────┬───────────────────┐
     ▼                 ▼                 ▼                   ▼
Tab 1: Home       Tab 2: Capital    Tab 3: Ledger       Tab 4: Settings
(Cash & Burn)     (Injections, Rev, (Monthly Cashflow & (Global Profile,
                   Gear & SaaS)      Action Ledger)      EN/TH, Backups)
```

---

## 2. Tab 1: Home (Context-Driven Cash & Burn)

### View 1A: Home in "Personal" Context
```
┌──────────────────────────────────────────────┐
│  [ 👤 Personal ▾ ]              (🔔)   [⚙️]  │  <-- Global Account Switcher
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 💳 PERSONAL CASH RESERVE                 │ │  <-- Google Pay Inspired Hero Card
│ │ ฿ 125,000.00                             │ │      (Matte Ink Black #141413)
│ │                                          │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ 🟢 RUNWAY: 40.1 MONTHS               │ │ │  <-- High-contrast Runway Pill
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │ Planned Monthly Burn        [Smoothed ▾] │ │  <-- Toggle: Smoothed vs Cash Outflow
│ │ ฿ 3,114.73 / mo                          │ │
│ │ ├ ฿2,577.50 Living Subscriptions         │ │
│ │ └ ฿537.23 Gear Depreciation              │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│     ( ＋ )        ( 💸 )       ( 📦 )   ( 📅 ) │  <-- 4 Circular Shortcut Buttons
│    + Expense    Inject Biz     + Gear   Due 30D│
│                                              │
│ ── UPCOMING BILLS (NEXT 30 DAYS) ────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 🚆 BTS SkyTrain                in 4 days │ │
│ │    Monthly Transit Pass         ฿1,400.00│ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 🌐 AIS Fibre                  in 12 days │ │
│ │    Home Internet                  ฿540.00│ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
│    [⌂ Home]    [🏛 Capital]    [📋 Ledger]  [⚙]│  <-- Persistent Bottom Dock
└──────────────────────────────────────────────┘
```

### View 1B: Home in "Fulltime Job" Context ("UNTIL" Metric — No Runway)
```
┌──────────────────────────────────────────────┐
│  [ 💼 Fulltime Job ▾ ]          (🔔)   [⚙️]  │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 🏢 TECH CONSULTANT SALARY                │ │  <-- Ink Black Card
│ │ ฿ 75,000.00 / month                      │ │
│ │                                          │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ ⏳ UNTIL NEXT PAYDAY: 14 DAYS        │ │ │  <-- "UNTIL" Replaces Runway
│ │ │ Expected Oct 28 • +฿75,000.00        │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ 🎯 UNTIL FREEDOM TARGET: 6 MONTHS    │ │ │  <-- Solopreneur Milestone Goal
│ │ │ ฿150,000 personal safety buffer goal │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│     ( ＋ )        ( 💰 )       ( 📅 )   ( ⚙️ ) │
│    + Bonus      Edit Base     Paydays   Routing│
│                                              │
│ ── SALARY FLOW ROUTING ──────────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 👤 Auto-sweep to Personal (Living)   70% │ │
│ │ 🚀 Venture Seed (FromSukong)         30% │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### View 1C: Home in "Business" Context (e.g. FromSukong)
```
┌──────────────────────────────────────────────┐
│  [ 🚀 FromSukong ▾ ]            (🔔)   [⚙️]  │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 💼 BUSINESS TREASURY                     │ │
│ │ ฿ 45,000.00                              │ │  <-- Business Cash Reserve
│ │                                          │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ 🟢 RUNWAY: 18.2 MONTHS               │ │ │  <-- Business Dedicated Runway
│ │ └──────────────────────────────────────┘ │ │
│ │                                          │ │
│ │ Net Monthly Burn: ฿2,472.50 / mo         │ │
│ │ ├ ฿5,000.00 Revenue (Stripe/Invoices)    │ │  <-- Business Revenue Stream
│ │ ├ ฿7,112.50 OpEx & SaaS Subscriptions    │ │  <-- Business SaaS Commitments
│ │ └ ฿360.00 Equipment Depreciation         │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│     ( ＋ )        ( 📥 )       ( 💸 )   ( 📦 ) │
│    + SaaS       + Revenue    Get Capital + Gear│
│                                              │
│ ── UPCOMING SAAS RENEWALS ───────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 💻 Opencode AI Dev Tool       in 19 days │ │
│ │    Monthly Subscription          ฿360.00│ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ ⚡ Make.com Automation        in 24 days │ │
│ │    Monthly Subscription           ฿57.50│ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 3. Tab 2: Capital (Injections, Revenue, Gear & SaaS)

All items strictly belong to the active entity. **Zero filter pills.**

### View 2A: Capital in "Business" Context (e.g. FromSukong)
```
┌──────────────────────────────────────────────┐
│ Capital & Structure: FromSukong        ( ＋ ) │
├──────────────────────────────────────────────┤
│ ── 1. CAPITAL INJECTIONS ────────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 📥 Founder Seed from Personal    Oct 01  │ │
│ │    Capital Inflow            +฿20,000.00 │ │  <-- Injected Funds
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 📥 Initial Formation Reserve     Jan 15  │ │
│ │    Capital Inflow            +฿25,000.00 │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── 2. REVENUE / INCOME (Stripe-Ready) ───────│
│ ┌──────────────────────────────────────────┐ │
│ │ 💳 Monthly Recurring Revenue (MRR)       │ │
│ │    ฿5,000.00 / month                     │ │  <-- Direct Income Entry
│ │    Status: Active • Next billing Nov 01  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── 3. HARDWARE & CAPITAL ASSETS ─────────────│
│ Total Book Value: ฿6,000 • Depreciation: ฿166/mo
│ ┌──────────────────────────────────────────┐ │
│ │ 📱 Nothing Phone 2a (Company Device)     │ │
│ │    Cost: ฿10,000 • 60 mo lifespan        │ │
│ │    [████████░░░░░░░░░░░░] 24/60 mos (40%)│ │  <-- Straight-line Progress
│ │    Book Value Remaining: ฿6,000.00       │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── 4. OPERATING COMMITMENTS (SaaS) ──────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 💻 Opencode Go              ฿360.00 / mo │ │
│ │ ⚡ Make.com                  ฿57.50 / mo │ │
│ │ 🌍 Domain Name (฿360/yr)     ฿30.00 / mo │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### View 2B: Capital in "Personal" Context
```
┌──────────────────────────────────────────────┐
│ Capital & Structure: Personal          ( ＋ ) │
├──────────────────────────────────────────────┤
│ ── 1. CAPITAL DEPLOYED TO VENTURES ──────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 🚀 Injected to FromSukong        Oct 01  │ │
│ │    Seed Transfer             -฿20,000.00 │ │  <-- Capital deployed outward
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── 2. PERSONAL ASSETS & GEAR ────────────────│
│ Total Book Value: ฿47,700 • Depreciation: ฿370/mo
│ ┌──────────────────────────────────────────┐ │
│ │ 📱 iPad Gen 9                ฿181.67 / mo│ │
│ │    Cost: ฿10,900 • 60 mo lifespan        │ │
│ │    [████████████████████] 59/60 mos (98%)│ │
│ │    ⚠️ Depreciates fully this month (฿0)  │ │  <-- Milestone Alert
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 🎧 SoundCore Space 1          ฿77.78 / mo│ │
│ │    Cost: ฿2,800 • 36 mo lifespan         │ │
│ │    [████████████░░░░░░░░] 24/36 mos (67%)│ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── 3. LIVING SUBSCRIPTIONS & BILLS ──────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 🚆 BTS SkyTrain            ฿1,400.00 / mo│ │
│ │ 🌐 AIS Fibre                 ฿540.00 / mo│ │
│ │ 📱 Mobile Internet           ฿170.00 / mo│ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 4. Tab 3: Monthly Ledger & Situation (Detailed Month Ledger)

Instead of vague forecast charts or repeating runway, Tab 3 provides a **precise month-by-month cashflow breakdown and chronological action ledger** for the active entity.

```
┌──────────────────────────────────────────────┐
│ Monthly Ledger: FromSukong                   │
├──────────────────────────────────────────────┤
│    ‹     [  October 2026  ▾  ]     ›         │  <-- Month Picker / Step Buttons
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 📊 OCTOBER CASH SITUATION                │ │  <-- Executive Monthly Summary Card
│ │ Starting Treasury:           ฿22,472.50  │ │
│ │ Inflows (Revenue + Seed):   +฿25,000.00  │ │
│ │ Outflows (SaaS + Gear):      -฿2,472.50  │ │
│ │ ───────────────────────────────────────  │ │
│ │ Net Cash Flow:              +฿22,527.50  │ │
│ │ Ending Treasury:             ฿45,000.00  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── OCTOBER ACTIONS & TRANSACTIONS ───────────│
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Oct 01 • Capital Transfer In             │ │
│ │ 📥 Founder Seed from Personal            │ │
│ │    Ref: TX-20261001-01      +฿20,000.00  │ │  <-- Action item with date & tag
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Oct 15 • Recurring Revenue               │ │
│ │ 💳 Client SaaS Retainer (Stripe)         │ │
│ │    Ref: INV-8821             +฿5,000.00  │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Oct 19 • Software Expense                │ │
│ │ 💻 Opencode AI Dev Tool                  │ │
│ │    Monthly Charge               -฿360.00 │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Oct 24 • Software Expense                │ │
│ │ ⚡ Make.com Integromat                   │ │
│ │    Monthly Charge                -฿57.50 │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Oct 31 • Depreciation Ledger             │ │
│ │ 📱 Nothing Phone 2a (Month 24/60)        │ │
│ │    Straight-line Non-Cash       -฿166.67 │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ [ + Log Manual Entry / Adjustment for Oct  ] │  <-- Quick Add Entry Button
└──────────────────────────────────────────────┘
```

---

## 5. Tab 4: Settings & Data (Global Management)

```
┌──────────────────────────────────────────────┐
│ Settings & Account Management                │
├──────────────────────────────────────────────┤
│ ── ACTIVE ENTITIES ──────────────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 👤 Personal                     (Default)│ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 💼 Fulltime Job                ฿75,000/mo│ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 🚀 FromSukong                   Active   │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ ＋ Add New Business Entity                 │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── PREFERENCES ──────────────────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 🌐 Language / ภาษา             [ English ▾]│ │
│ │    Switch between English and ไทย         │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ── ON-DEVICE DATA & PRIVACY ─────────────────│
│ ┌──────────────────────────────────────────┐ │
│ │ 📤 Export JSON Backup                      │ │
│ │    Download complete database to phone   │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 📥 Import JSON Backup                      │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 🔄 Restore Verified Baseline (฿3,114.73)   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ excited.live v0.1.0 • Luxury Privacy Engine   │
└──────────────────────────────────────────────┘
```

---

## 6. Modal Drawer: Capital Injection

Triggered by tapping **`Inject Biz`** from Personal, or **`Get Capital`** from Business:

```
┌──────────────────────────────────────────────┐
│                     ───                      │
│ Transfer Capital to Business                 │
├──────────────────────────────────────────────┤
│ From:  [ 👤 Personal (฿125,000 available) ]  │
│ To:    [ 🚀 FromSukong (฿45,000 reserve)  ]  │
│                                              │
│ AMOUNT TO TRANSFER                           │
│ ┌──────────────────────────────────────────┐ │
│ │ ฿  20,000.00                             │ │  <-- Large Numeric Focus
│ └──────────────────────────────────────────┘ │
│                                              │
│ RUNWAY IMPACT PREVIEW:                       │
│ ┌──────────────────────────────────────────┐ │
│ │ 👤 Personal Runway: 40.1 mos → 33.7 mos  │ │
│ │ 🚀 FromSukong Runway: 18.2 mos → 26.3 mos│ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │       CONFIRM CAPITAL INJECTION          │ │  <-- Ink Black Button
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```
