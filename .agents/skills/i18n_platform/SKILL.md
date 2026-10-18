---
name: i18n_platform
description: >-
  Bilingual (EN + TH) localization for the excited.live repo: the packages/i18n engine,
  the webapp's SSR locale wiring, and the dictionary conventions. Use this skill when
  adding or touching UI strings, dictionaries, locale resolution, the language toggle,
  translator use, or any en/th label work in webapp or landing.
---

# i18n Platform Skill

`packages/i18n` is the localization engine: pure TypeScript, bilingual EN + TH, no
network, no DOM, no framework. The webapp wires it into SSR through middleware and a
React context; the landing app handles its own copy with the same bilingual spirit.
This skill covers the package surface, the webapp wiring, and the conventions that
keep EN and TH consistent.

## 1. Package surface (`packages/i18n/src/index.ts`, 136 lines)

Workspace name `@excited-live/i18n`. Everything exported:

- `Locale = "en" | "th"`, `LOCALES: readonly Locale[]` (`["en", "th"] as const`),
  `DEFAULT_LOCALE = "en"`
  (product launches EN-first in Thailand).
- `LocalizedLabel { en: string, th: string }`. The same structural shape exists in
  `packages/tax/src/types.ts`; both engines speak the same label so tax labels render
  with the same translator as UI strings.
- `Dictionary = Record<string, LocalizedLabel>`: stable keys, bilingual values.
- `isLocale(value): value is Locale` (exact "en"/"th" only).
- `toLocale(value)`: narrows unknown values (cookies, headers, storage). Trims,
  lowercases, splits on "-", and matches the BASE language: "th-TH" gives "th".
  Unsupported languages give undefined, callers apply their own default.
- `translateLabel(label, locale)`: the label lookup. TH falls back to EN when its
  string is empty ("th" empty means not translated yet: falls back visibly, not
  silently).
- `Translator { locale, t(key, vars?), label(LocalizedLabel) }`.
- `interpolate(template, vars?)`: fills `{name}` placeholders. Unknown names stay
  visible (the raw `{action}` remains in the text) so a bad call shows up in review
  instead of vanishing.
- `createTranslator(dictionaries, locale?)`: builds a translator. Dictionary lookup
  falls back to the EN dictionary, then to the key itself: a missing key renders as
  the key string ("nope"), deliberate and test-pinned so gaps are visible.
- Locale resolution helpers consumed by webapp middleware:
  - `LOCALE_COOKIE = "excited_live_locale"`.
  - `localeCookieValue(locale, { secure? })`: serializes
    `excited_live_locale=th; Path=/; Max-Age=31536000; SameSite=Lax` (+ "; Secure"
    when passed). Value is validated through toLocale.
  - `localeFromCookie(cookieHeader)`: parses the cookie header.
  - `localeFromAcceptLanguage(header)`: RFC 7231 parsing with q-values; highest
    quality wins, order wins ties, q=0 and unsupported tags drop, MALFORMED or
    out-of-range q invalidates that candidate entirely (never promoted by default),
    3-decimal precision enforced. Empty/no-match gives undefined.

## 2. Tests (`packages/i18n/src/index.test.ts`, 18 tests)

Pinned behavior: DEFAULT_LOCALE/LOCALES; isLocale and toLocale ("th-TH" base match,
case-insensitive " EN ", non-strings); translateLabel EN + TH and the empty-TH
fallback; createTranslator key resolution, key-as-fallback, EN-dictionary fallback
when a locale has no dictionary of its own, engine label() use, interpolation with
kept-unknown placeholders; Accept-Language: quality ordering ("fr-FR, th-TH;q=0.9,
en;q=0.8" gives "th"), order tie-break, unsupported languages, q=0, case-insensitive
q, whitespace, malformed and out-of-range q ("q=1e2", "q=1.5", "q=0.5foo"),
q precision 0.955 over 0.9, empty headers; cookie round-trip, multi-cookie headers,
"th-TH" cookie value, invalid values.

## 3. Webapp wiring: the request middleware (`apps/webapp/src/start.ts`)

`start.ts` builds the start instance; its request middleware are, in order: locale,
csrf, authkit (when configured), the auth guard (when configured and required; see
the `auth_workos` skill). The locale middleware:

1. Reads the `excited_live_locale` cookie.
2. Falls back to `Accept-Language` through `localeFromAcceptLanguage`.
3. Falls back to `"en"`.
4. Resolution order matters for the cookie write: only a FIRST VISIT (no cookie) with
   a non-EN locale appends a `set-cookie` header (`localeCookieValue(locale, {
   secure: true })`), guarded in try/catch so a cookie failure can never break
   rendering.
5. Exposes the resolved locale to routes via the middleware context (route context
   receives it as `serverContext.locale`).

An explicit cookie beats the browser header on every later request; the header only
decides the first visit.

## 4. Webapp wiring: route context and provider

`apps/webapp/src/routes/__root.tsx` (root route) does the handoff:

`beforeLoad` reads `serverContext?.locale` (attached by the middleware; typed loosely
because it is untyped upstream) or re-derives on the client: SSR gets the
middleware-resolved locale, client navigation re-derives from
`document.cookie` (localeFromCookie) or DEFAULT_LOCALE.

`RootComponent` wraps the tree in `<LocaleProvider initialLocale={locale}>`.
`RootDocument` renders `<AppDocument lang={locale} theme="light">`, so `<html lang>`
always matches the active locale.

`apps/webapp/src/lib/locale-context.tsx` supplies `LocaleProvider` and `useLocale()`
(throws outside a provider). The provider:

- Holds `locale` state seeded from `initialLocale`.
- On toggle, `setLocale` writes `document.cookie` via `localeCookieValue(next)` and
  sets state; no reload needed. The cookie then wins for the server on the next
  request and for the client through context.
- `t` comes from `getTranslator(locale).t` (the dictionary module below), memoized on
  `locale`.
- An effect keeps `document.documentElement.lang` in sync with the state (also covers
  client toggles after hydration).

## 5. Dictionaries (`apps/webapp/src/lib/dictionaries.ts`)

One dictionary, `strings: Dictionary`: stable keys ("app.title", "nav.plan",
"metric.netWorth", ...), each with `{ en, th }` and EN FIRST. Conventions in the
file header, enforced by review: keys are stable IDs; selection state uses keys,
never rendered text. Any UI never keys its logic off locale-specific text.

Consumers: `getTranslator(locale)` builds
`createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)`.
`thOverrides` exists (currently empty) so Thai-specific overrides can land without
touching EN strings. In components: `const { t } = useLocale()`.

## 6. Conventions worth a rule

- Bilingual labels everywhere: tax engine labels (`LocalizedLabel`), UI strings in
  dictionaries.ts, landing copy (data-lang spans): all carry en + th side by side.
- EN first field order (`{ en, th }`) matches packages/tax; keep it.
- Keys are stable IDs; selection state uses keys, never text (a Select options label
  rendered to Thai must not throw off option identity).
- Interpolation uses `{name}` placeholders; unknown names stay visible.
- Missing TH translations fall back visibly (translateLabel EN fallback; missing keys
  render the key itself) so gaps cannot hide. A missing key IS a bug though: add the
  key to dictionaries.ts in the same PR that consumes it.
- English source of truth: when you add a string, write EN once and translate; never
  duplicate EN copy into the TH field.

## 7. SSR locale flow end to end

Request reaches start.ts middleware → locale resolved (cookie, then header, then
"en"; cookie set on first visit) → route context exposes it → `__root.tsx`
beforeLoad picks it up → RootComponent wraps LocaleProvider → components consume
`useLocale().t` → client hydration starts from the SAME value: the middleware set the
cookie on first visit, and the client re-derives from that cookie if a fresh
navigation bypasses the SSR value.

Where it can drift, and how to check:

- Client paths that skip `beforeLoad` (rare in TanStack Start) or cached routes may
  hold a stale locale: check `document.documentElement.lang` AND the rendered text
  AND the cookie value agree.
- A locale toggle followed by a hard reload relies on the cookie: verify
  `excited_live_locale` is present and the SSR HTML (curl the route) matches the
  chosen language.
- A missing dictionary key: visible as the raw key string in the rendered page
  (grep the page source for `t("` style tokens if unsure).

## 8. The landing app has its own copy handling (verified)

`apps/landingpage` is Astro and does NOT import `@excited-live/i18n` (repo grep
against imports in the landing app is empty at authoring time). It supports two
languages differently:

- `WaitlistForm.tsx` holds COPY consts `{ en: {...}, th: {...} }` (EN first, same
  convention).
- `LangSelect.tsx` (client island) and pure-CSS toggles flip `<html data-lang>` which
  the inline boot script in layout.astro seeds from `localStorage['exl-lang']` BEFORE
  first paint; elements carry `data-lang-en` / `data-lang-th` span pairs.
- Detail (see the `landing_seo` skill): because SSR renders both spans and CSS hides
  one, the form's React state re-derives from the `data-lang` attribute on change
  (MutationObserver in WaitlistForm.tsx; LangSelect renders an empty trigger until
  synced to avoid flashing the wrong label after hydration).

Do not "migrate" landing copy to packages/i18n as a drive-by. The landing app is a
separate static surface; unify only if a spec asks for it, and carry the domain
knowledge first (the data-lang mechanics differ from the React context flow).

## 8b. Mobile (`apps/biz-mobile`) uses the same engine

`@excited-live/i18n` is a workspace dependency of biz-mobile. No custom `t()` lives in the app.

- `src/i18n/dictionary.ts`: `strings: Dictionary`, `{ en, th }`, EN first, stable `area.name` keys.
- `src/i18n/index.ts`: `getTranslator(locale)` (cached `createTranslator`), `t(key, locale, vars)`
  (non-hook helper; numeric vars are stringified), `resolveInitialLocale()`, `saveLocale()`.
- `src/application/hooks/useT.ts`: `const { t } = useT()` binds the translator to the active locale.
  Use this in new code instead of threading a `lang` prop.
- `MobileLocale` is an alias of the package `Locale`.
- Locale state lives in `UIProvider` (`src/app/ui-context.tsx`, `lang` / `setLang`). Initial value:
  the `initialLang` prop (tests), else the saved choice (`localStorage` key
  `excited_live_mobile_locale`), else the device language (`toLocale(navigator.language)`), else
  `DEFAULT_LOCALE`. `setLang` persists and `document.documentElement.lang` follows. This is a UI
  preference, not domain data, so it does not conflict with the "no offline domain persistence"
  rule. There is no SSR in the Tauri app, so device APIs are safe here; the cookie/middleware flow
  in sections 3-4 is webapp-only.
- Not yet migrated: components still receive a `lang` prop and call `t(key, lang)`. Both styles
  work; move a component to `useT()` when you next touch it.

## 9. Commands

```bash
# Engine checks (what CI runs per package)
pnpm --filter @excited-live/i18n test      # vitest, 18 tests at authoring time
pnpm --filter @excited-live/i18n typecheck # tsc --noEmit
pnpm --filter @excited-live/i18n build     # tsup build
```

Compatibility: webapp typecheck covers `dictionaries.ts`, `locale-context.tsx`,
`start.ts` and `__root.tsx`:

```bash
pnpm --filter @excited-live/webapp typecheck
pnpm --filter @excited-live/biz-mobile typecheck   # mobile consumer
```

`@excited-live/i18n` has no runtime dependencies, so a fresh install typechecks with
no dist prebuild (no package needs to be built first).

## 10. Pitfalls

- Hydration mismatch: any locale source the server cannot see (localStorage,
  screen size, browser setting) is OFF-LIMITS for the initial React state. Only the
  middleware-resolved locale enters `initialLocale`; the client re-derives the SAME
  value from the cookie set during SSR. Never patch the client to read localStorage
  while SSR reads a cookie.
- Base-language matching: `th-TH` and `th_TH` and "TH" all match "th" through
  toLocale, but `localeFromAcceptLanguage` operates on the raw token through the
  same path, so a nonstandard Accept-Language entry like "th" plus "Q" casing still
  resolves to Thai. Add regression tests if you touch toLocale.
- Cookie flags: `localeCookieValue(locale, { secure: true })` for HTTPS-only
  deployments (start.ts middleware uses secure: true). If you serve http://localhost,
  the plain variant is fine: the param exists so dev loops can read the cookie.
- Never derive state from rendered text (e.g. reading the DOM to learn the locale);
  keys and the documentElement `lang`/`data-lang` attribute are the state.
- The landing app does not use packages/i18n; two systems are intentional. Read
  section 8 before "unifying" them.
- Engine labels: `LocalizedLabel` comes from packages/tax (types.ts); the i18n
  package defines the same shape. They are structurally compatible; do not import
  tax types into i18n or the reverse.
