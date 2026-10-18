# Mobile Page & Component Architecture Reference

This document is the authoritative reference for organizing pages, page-scoped components, shared components, custom hooks, and Playwright Component Visual Tests in `apps/biz-mobile`.

All AI coding agents MUST follow this structure when implementing or refactoring features in `apps/biz-mobile`.

---

## 1. Directory & File Layout

```text
apps/biz-mobile/src/
├── domain/                         # Pure business logic & types (no React/DOM)
│   ├── types.ts
│   └── selectors.ts
├── service/                        # Strict I/O boundary: API client, queries, mutations
│   ├── accounting/                 # Hono RPC client, keys, queries, mutations
│   ├── auth/                       # Token store & auth mutations
│   ├── catalog/                    # Catalog autocomplete queries
│   └── http/                       # Base URL resolution & RPC clients
├── app/                            # Application shell: routing context & UI state
│   └── ui-context.tsx              # UI-only state (activeTab, activeEntityId, lang, etc.)
├── i18n/                           # Localization on top of @excited-live/i18n
│   ├── dictionary.ts               # strings: Dictionary ({ en, th }, EN first, stable keys)
│   └── index.ts                    # getTranslator, t, resolveInitialLocale, saveLocale
├── application/hooks/              # Domain-scoped consumer hooks
│   ├── useFinances.ts
│   ├── useAppUI.ts
│   ├── useUserData.ts
│   ├── useCloudSync.ts
│   ├── useT.ts                     # Translator bound to the active locale
│   └── index.ts
├── components/                     # ONLY components shared across 2+ pages
│   ├── AddBusinessDrawer/
│   │   ├── AddBusinessDrawer.tsx
│   │   └── index.ts
│   ├── AddRevenueDrawer/
│   │   ├── AddRevenueDrawer.tsx
│   │   └── index.ts
│   ├── BottomDock/
│   │   ├── BottomDock.tsx
│   │   ├── BottomDock.spec.tsx
│   │   ├── index.ts
│   │   └── __snapshots__/
│   ├── CurrencyInput/
│   │   ├── CurrencyInput.tsx
│   │   ├── CurrencyInput.spec.tsx
│   │   ├── index.ts
│   │   └── __snapshots__/
│   ├── Header/
│   │   ├── Header.tsx
│   │   ├── Header.spec.tsx
│   │   ├── index.ts
│   │   └── __snapshots__/
│   ├── ModalImageSection/
│   │   ├── ModalImageSection.tsx
│   │   └── index.ts
│   └── index.ts
└── pages/                          # Feature pages & page-scoped components/hooks
    ├── home/
    │   ├── Home.tsx                # Page assembly (delegates logic to useHome & UI to components/)
    │   ├── Home.spec.tsx           # Page-level Playwright visual test
    │   ├── __snapshots__/
    │   ├── hooks/
    │   │   ├── useHome.ts          # Page state, selectors, and modal controls
    │   │   └── index.ts
    │   └── components/             # Components used ONLY in the Home page
    │       ├── CareerDrawer/
    │       │   ├── CareerDrawer.tsx
    │       │   └── index.ts
    │       ├── HomeAppSection/
    │       │   ├── HomeAppSection.tsx
    │       │   ├── HomeAppSection.spec.tsx
    │       │   ├── index.ts
    │       │   └── __snapshots__/
    │       ├── HomeCareerOnboarding/
    │       │   ├── HomeCareerOnboarding.tsx
    │       │   ├── HomeCareerOnboarding.spec.tsx
    │       │   ├── index.ts
    │       │   └── __snapshots__/
    │       ├── HomeEntitiesSection/
    │       │   ├── HomeEntitiesSection.tsx
    │       │   ├── HomeEntitiesSection.spec.tsx
    │       │   ├── index.ts
    │       │   └── __snapshots__/
    │       ├── HomeHeroBackground/
    │       │   ├── HomeHeroBackground.tsx
    │       │   ├── HomeHeroBackground.spec.tsx
    │       │   ├── index.ts
    │       │   └── __snapshots__/
    │       ├── HomeTreasuryPanel/
    │       │   ├── HomeTreasuryPanel.tsx
    │       │   ├── HomeTreasuryPanel.spec.tsx
    │       │   ├── index.ts
    │       │   └── __snapshots__/
    │       └── index.ts
    ├── management/
    │   ├── Management.tsx
    │   ├── Management.spec.tsx
    │   ├── __snapshots__/
    │   ├── hooks/
    │   │   ├── useManagement.ts
    │   │   └── index.ts
    │   └── components/             # Components used ONLY in the Management page
    │       ├── AddExpenseDrawer/
    │       ├── AddGearDrawer/
    │       ├── AddLiabilityDrawer/
    │       ├── CapitalDrawer/
    │       ├── CapitalHeroCard/
    │       ├── HeroCarousel/
    │       ├── HeroShell/
    │       ├── LedgerHeroCard/
    │       ├── ManagementAssetsSection/
    │       ├── ManagementExpenseSection/
    │       ├── ManagementHeroSection/
    │       ├── ManagementIncomeSection/
    │       ├── ManagementLedgerSection/
    │       ├── ManagementLiabilitySection/
    │       ├── MonthStepper/
    │       └── index.ts
    ├── settings/
    │   ├── Settings.tsx
    │   ├── Settings.spec.tsx
    │   ├── __snapshots__/
    │   ├── hooks/
    │   │   ├── useSettings.ts
    │   │   └── index.ts
    │   └── components/             # Components used ONLY in the Settings page
    │       ├── SettingsCloudSyncSection/
    │       ├── SettingsDataPortabilitySection/
    │       ├── SettingsLanguageSection/
    │       ├── SettingsProfileSection/
    │       └── index.ts
    └── signin/
        ├── Signin.tsx
        ├── Signin.spec.tsx
        ├── __snapshots__/
        ├── hooks/
        │   ├── useSignIn.ts
        │   └── index.ts
        └── components/
            ├── GoogleIcon/
            └── index.ts
```

---

## 2. Core Rules for AI Agents

### Rule 1: Co-locate Page-Specific Components
- If a component, section, card, or drawer is used by **only one page**, place it inside `src/pages/<page>/components/<ComponentName>/`.
- Only promote a component to `src/components/<ComponentName>/` when it is shared across **two or more pages** (e.g., `Header`, `BottomDock`, `AddBusinessDrawer`, `AddRevenueDrawer`, `CurrencyInput`, `ModalImageSection`).

### Rule 2: Dedicated Folder per Component
Every component (both shared and page-scoped) must live in its own PascalCase directory containing:
- `<ComponentName>.tsx` — Component implementation and exported props interface (`<ComponentName>Props`).
- `index.ts` — Barrel file re-exporting `<ComponentName>` and `<ComponentName>Props`.
- `<ComponentName>.spec.tsx` — Playwright component visual test (for visual sections, cards, and widgets).

### Rule 3: Thin Pages + Page Hooks + Section Components
- **Page file (`src/pages/<page>/<Page>.tsx`)**: Keep the top-level page declarative. It calls `use<Page>()` and composes section components and drawers. Do not embed large blocks of raw JSX or complex state calculations directly in `<Page>.tsx`.
- **Page hook (`src/pages/<page>/hooks/use<Page>.ts`)**: Encapsulates all state hooks (`useAccounts`, `useCashflow`, `useAppUI`, etc.), modal open/close states, and derived metrics for that page.
- **Route boundary (`src/routes/index.tsx`)**: Cross-page tab switching (e.g. selecting an entity on Home and navigating to the Capital/Management tab) is wired at the route level via props like `onSelectAccount`, keeping page components decoupled from router navigation.

### Rule 4: Localization via `@excited-live/i18n`
- Every user-facing string is a key in `src/i18n/dictionary.ts` with `{ en, th }` (English first). Add the key in the same change that uses it; a missing key renders as the key itself.
- In components and hooks use `const { t } = useT()` (`application/hooks/useT.ts`). Interpolate with `{name}` placeholders: `t("ledger.actions", { count: String(n), month })`.
- Do not write a local `t()` or a second dictionary, and do not key logic off translated text (use ids).
- Locale (`lang`/`setLang`) lives in `UIProvider`: `initialLang` prop (tests), else saved choice, else device language, else `en`; persisted and mirrored to `<html lang>`. Legacy components still take a `lang` prop and call `t(key, lang)` from `src/i18n`; migrate them to `useT()` when touched.
- Details: `i18n_platform` skill, section 8b.

### Rule 5: Direct Component Mounting in Playwright Visual Tests (No `.story.tsx` or `TestScaffold`)
- **Do NOT create `.story.tsx` files or `TestScaffold.tsx` wrappers.**
- `playwright/gallery/main.tsx` automatically discovers all components in `src/components/**` and `src/pages/**` and wraps the mounted root in `<Theme theme={mastercardTheme} mode="light">`, `<QueryClientProvider>` pre-hydrated with fixtures (`src/testing/fixtures.ts`), and `<UIProvider>`.
- Mount components directly by name (or relative path) and pass props in the second argument of `mount(name, props)`:

```tsx
// Example: apps/biz-mobile/src/pages/home/components/HomeCareerOnboarding/HomeCareerOnboarding.spec.tsx
import { test, expect } from "@playwright/test";

test.describe("HomeCareerOnboarding Visual", () => {
	test("renders career onboarding card and matches screenshot", async ({ mount }) => {
		const component = await mount("HomeCareerOnboarding");
		await expect(component).toHaveScreenshot("home-career-onboarding-default.png");
	});
});
```

```tsx
// Example with props: apps/biz-mobile/src/pages/management/components/CapitalHeroCard/CapitalHeroCard.spec.tsx
import { test, expect } from "@playwright/test";
import { FIXTURE_ACCOUNTS } from "../../../../testing/fixtures";

test.describe("CapitalHeroCard Component Visual", () => {
	test("renders personal wealth hero card and matches screenshot", async ({ mount }) => {
		const component = await mount("CapitalHeroCard", {
			account: FIXTURE_ACCOUNTS[0]!,
		});
		await expect(component).toHaveScreenshot("capital-hero-card-personal.png");
	});
});
```

```tsx
// Example for a full page: apps/biz-mobile/src/pages/home/Home.spec.tsx
import { test, expect } from "@playwright/test";

test.describe("Home Page Visual", () => {
	test("renders home page dashboard and matches screenshot", async ({ mount }) => {
		const component = await mount("Home");
		await expect(component).toHaveScreenshot("home-page-default.png");
	});
});
```

- **Tight Bounding Box**: `playwright/gallery/main.tsx` uses `display: inline-block; width: 100%` on `#root` so component screenshots capture the exact height of the mounted component without artificial 844px empty whitespace.
