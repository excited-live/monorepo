# Images for MCP onboarding: server-picked logos + generated per-kind tiles

## Context

When a user onboards through their AI agent over `/mcp`, nothing they create gets an image:
- The create tools take an optional free-text `imageUrl`, but the guide and tool descriptions never mention it.
- The server never fills it.
- The catalog guess only runs in the app's drawers (`useCatalogAutofill` → `/catalog/resolve`).

The result is a bare home screen next to one onboarded in the app.

Decisions from the grilling:
- **The user never chooses an image during MCP onboarding.** The server picks the best guess, and the user can change it later in the app.
- **The server decides.** `imageUrl` is removed from the MCP create inputs.
- **Only real matches are stored:** an exact or prefix catalog match, or a domain written in the name. Anything else stores `null`.
- **No match draws a generated per-kind tile in the app:** a kind icon on a kind tint. No stock photos. This also covers the auto-created "Main Wallet" records for every user without storing anything.
- **The hero gets a generated brand-gradient cover** when there is no image.
- **Liabilities get an image picker** in `AddLiabilityDrawer`, so a server-picked logo can be edited.
- **The agent is told** that images are automatic and can be changed in the app.
- **Out of scope:** an MCP update/edit-image tool (#143), user-facing skill files, and the app-side `/catalog/resolve` single-word favicon fallback.

## 1. Pure image picker: `packages/accounting`

New `packages/accounting/src/image.ts`, exported from `src/index.ts`. It must stay pure: no network, no DOM.

```ts
export type ImageSubject =
  | { kind: "business" } | { kind: "asset"; assetKind: "cash" | "fixed" | "investment" }
  | { kind: "income"; incomeKind: ... } | { kind: "expense" } | { kind: "liability" };
export function pickSuggestedImage(name: string, subject: ImageSubject): string | undefined
```

1. Map the subject to a catalog type:

   | Subject | Catalog type |
   |---|---|
   | asset with `fixed` | `hardware` |
   | income with `employment` | `career`, preferring `coverImageUrl` and then `imageUrl` |
   | other income | `revenue` |
   | expense | `subscription` |
   | liability | `liability` |
   | business, cash asset, investment asset | no catalog lookup; only step 3 applies |

2. Run a **strict match** with a new `findStrictCatalogMatch(query, type)` in `catalog.ts`, next to `findBestCatalogMatch`:
   - an exact name or alias match, or
   - a name that starts with a preset name or alias on a word boundary (`"Netflix Premium"` → Netflix).
   - Never a bare substring hit. Leave `findBestCatalogMatch` as it is; the app autofill still uses it.
3. If there is no match and the name contains a real domain (regex for `label.tld`, e.g. `figma.com`), use `resolveFaviconUrl(domain)` (`catalog.ts:62`).
4. Otherwise return `undefined`.

Tests go in `packages/accounting/tests/catalog.test.ts`, or a new `image.test.ts`:
- exact, alias and prefix matches
- a substring-only name gets no image (e.g. "Pro Savings")
- a domain in the name gets a favicon
- employment picks the cover image
- business and cash assets get nothing

## 2. MCP tools: `apps/api/src/modules/mcp`

**`tools/onboarding.tools.ts`**
- Add a `withoutImage` step next to `optionalEntity` and `optionalEntityUnion` (:35-50) that `.omit({ imageUrl: true })` on each option. The agent then never sees the field, and any `imageUrl` it sends anyway is stripped.
- In each create handler, set `imageUrl: pickSuggestedImage(name, subject)` on the parsed body before calling the service:
  - `create_business` (:171)
  - `add_asset` (:182)
  - `add_liability` (:194)
  - `add_income` (:208)
  - `add_expense` (:220)
- The created record already comes back in the result, so the agent can see the image that was picked.
- Add one sentence to each create tool's description: "The image is picked automatically."

**`instructions.ts`**
- Add a guide line: "Images are set automatically from the catalog; don't ask the user for pictures. In the recap, mention they can change any image in the app."
- Bump `Guide version: 1.` to `2.`

**`mcp.test.ts`**
- `add_expense` named "Netflix" stores the catalog `imageUrl`.
- An unmatched name stores none.
- A sent `imageUrl` is ignored.
- `add_income` with employment and a career preset stores the cover image.

Leave the REST routes and the service unchanged. REST create still stores exactly what the app sends, so the app's "Remove image" keeps working.

## 3. Generated tiles: `apps/biz-mobile`

Load the `mobile_architecture` and `design_system` skills first. Follow `page_component_structure.md`.

**Icons**
- Add the missing kind icons to `packages/design-system/src/icons.tsx`: briefcase (income), receipt (expense), card/bank (liability), building (business), box or laptop (gear).
- Reuse `WalletIcon` and `ChartIcon` (investment).

**`components/EntityThumb/EntityThumb.tsx`**
- Add an optional `kind` prop: `"wallet" | "gear" | "investment" | "income" | "expense" | "liability" | "business"`.
- With no image and a `kind`, render the kind icon on a per-kind tint, using theme tokens rather than raw hex where tokens exist.
- With no `kind`, keep the initials.

**`components/ItemRow/ItemRow.tsx`**
- Replace the string `fallback` prop with a `kind` prop that is passed through to `EntityThumb`.
- Update the four management sections that pass glyphs today (Assets `"฿"`, Liability `"💳"`, Income `"💼"`, Expense `"CI"`) and map asset kind → wallet, gear or investment.
- The ledger rows (`↓ ↑ ⚡`) are transactions, not records, so they stay as they are.

**`HomeEntitiesSection.tsx:88-103`**
- The career sub-card uses the income tile instead of initials.

**`ManagementHeroSection.tsx:41-57`**
- When `bgImg` is empty, render a brand-gradient cover in the same box, built from design tokens.
- `useImageTone` already returns `"light"` for no image. Check that the hero text stays readable on the gradient; if not, give the generated cover a fixed tone.

**`AddLiabilityDrawer.tsx`**
- Add an `imageUrl` state.
- Add a square `ModalImageSection`, wired to the liability autofill the same way `AddGearDrawer.tsx:41-187` does it (touched flag included).
- Pass `imageUrl` through `addLiability` and `updateLiability`. `useFinances.ts:270` already replaces `imageUrl` on update, so a removal clears it. Confirm that the `addLiability` signature carries it.

**Strings**
- No new UI strings are expected; the icons are decorative and their alt text is the record name.
- Any label that does get added must be `{ en, th }`.

## Verification

1. `pnpm test` covers the picker unit tests and the `/mcp` tests.
2. `pnpm build && pnpm typecheck && pnpm lint` must pass with 0 warnings.
3. Run `pnpm test:visual:mobile`. Diffs are expected for EntityThumb, ItemRow, the management sections, the hero and AddLiabilityDrawer. Re-record the baselines **on the CI runner** (workflow_dispatch → "Re-record baselines on the CI runner") and commit the PNGs.
4. Run the `verify` skill on an isolated local stack (`apps/api` + biz-mobile), with screenshots as evidence:
   - Sign up, mint an agent key, then call `/mcp`:
     - `create_business` "Fromsukong": no image, so the generated business tile and the gradient hero show
     - `add_expense` "Netflix": Netflix logo
     - `add_asset` fixed "MacBook Pro": catalog image
     - `add_liability` "Kasikorn car loan": liability tile
     - `add_income` employment matching a career preset: cover image in the hero
   - In the app, open the liability and change, then remove, its image. Remove a picked Netflix logo, then confirm it stays removed and shows the expense tile.
5. Before pushing, run the local review gate (`autonomous_run` §6), with cross-family review per rule 8.
6. Open the PR with `**Human attention needed:** YES — user-visible visuals + MCP tool schema change` and `Closes` the issue if one exists. Note #138 as related.

## Critical files

- `packages/accounting/src/catalog.ts`, `src/image.ts` (new), `src/index.ts`, `tests/`
- `apps/api/src/modules/mcp/tools/onboarding.tools.ts`, `instructions.ts`, `mcp.test.ts`
- `packages/design-system/src/icons.tsx`
- `apps/biz-mobile/src/components/EntityThumb/EntityThumb.tsx`, `components/ItemRow/ItemRow.tsx`
- `apps/biz-mobile/src/pages/management/components/{ManagementAssetsSection,ManagementLiabilitySection,ManagementIncomeSection,ManagementExpenseSection,ManagementHeroSection,AddLiabilityDrawer}/`
- `apps/biz-mobile/src/pages/home/components/HomeEntitiesSection/HomeEntitiesSection.tsx`

## Task split (for implementers)

Two independent tasks. They touch disjoint files and run in parallel, each in its own worktree branched from `preamza02/Setup-The-Suggested-Image-and-ability-to-add-Image-when-onboarding-via-CLI`.

### T1: server picker + MCP tools (sections 1 and 2)

- **May touch:**
  - `packages/accounting/src/catalog.ts`
  - `packages/accounting/src/image.ts` (new)
  - `packages/accounting/src/index.ts`
  - `packages/accounting/tests/*.test.ts`
  - `apps/api/src/modules/mcp/tools/onboarding.tools.ts`
  - `apps/api/src/modules/mcp/instructions.ts`
  - `apps/api/src/modules/mcp/mcp.test.ts`
  - `apps/api/openapi.json`, only if a generator script changes it; never edit it by hand
- **Contract:**
  - `findStrictCatalogMatch(query, type?) : CatalogItem | null` in `catalog.ts`
  - `pickSuggestedImage(name: string, subject: ImageSubject): string | undefined` and `type ImageSubject` in `image.ts`, both exported from the package index
  - Asset kinds are `cash | fixed | investment`, income kinds are `employment | business | investment | other`, and liability kinds are `loan | revolving | other`.
- **Prefix rule:** after lowercasing and trimming, the query equals a preset name or alias, or it starts with one followed by a space or punctuation.
- **Domain rule:** the name contains a token matching `/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i`. Pass the matched domain to `resolveFaviconUrl`.
- **Done command:**
  ```
  pnpm --filter @excited-live/accounting test && pnpm --filter @excited-live/api test && pnpm typecheck && pnpm lint
  ```
  If the filter names differ, find the real package names in each `package.json`.

### T2: generated tiles + hero cover + liability picker (section 3)

- **May touch:**
  - `packages/design-system/src/icons.tsx`
  - `apps/biz-mobile/src/components/EntityThumb/*`
  - `apps/biz-mobile/src/components/ItemRow/*`
  - `apps/biz-mobile/src/pages/management/components/{ManagementAssetsSection,ManagementLiabilitySection,ManagementIncomeSection,ManagementExpenseSection,ManagementHeroSection,AddLiabilityDrawer}/*`
  - `apps/biz-mobile/src/pages/home/components/HomeEntitiesSection/*`
  - `apps/biz-mobile/src/application/hooks/useFinances.ts`, only if `addLiability` needs `imageUrl` plumbing
  - the liability domain mapper, only if it drops `imageUrl`
- **Must load:** the `mobile_architecture`, `design_system` and `frontend_engineering` skills.
- **Contract:**
  - `EntityThumbKind = "wallet" | "gear" | "investment" | "income" | "expense" | "liability" | "business"`, exported from `components/EntityThumb`.
  - `EntityThumb` gains `kind?: EntityThumbKind`.
  - `ItemRow` replaces `fallback?: string` with `kind?: EntityThumbKind`.
- **Do not:** re-record visual baselines locally (CI does that), or touch the ledger rows.
- **Done command:**
  ```
  pnpm build && pnpm typecheck && pnpm lint
  ```
  Then run `pnpm test:visual:mobile`. Report which snapshots differ; diffs are expected.
