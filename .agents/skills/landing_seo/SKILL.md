---
name: landing_seo
description: >-
  The Astro marketing site in apps/landingpage: routes, meta and SEO layer, waitlist
  flow, blog and docs content pipeline, OG images, analytics shim. Use this skill when
  touching apps/landingpage (landing copy, blog, docs, sitemap, OG images, robots,
  meta tags, search index), or when a change adds a page that must ship with correct
  title, description, canonical, OG tags, and structured data.
---

# Landing SEO Skill (apps/landingpage)

The marketing surface: static Astro site deployed to Cloudflare Pages Production
(project `excited-live`; see the `deployment_ci` skill for the deploy tiers, preview
sanitize rules, and wrangler facts; this skill does not duplicate them).

## 1. App shape

Workspace `@excited-live/landingpage` (`apps/landingpage/package.json`: dev = astro
dev, build = astro build, preview = astro preview, typecheck = astro check). Tech:
Astro + React islands + fumadocs (blog/docs/search) + KaTeX.

```text
src/
  pages/
    index.astro               # landing: hero + phone, before/after toggle, features,
                              # coming-next, web-planner teaser, perks, waitlist
    blog/index.astro          # blog index
    blog/[slug].astro         # one post (deck beats stripped)
    blog/[slug]/slides.astro  # the deck built from :::slide blocks
    docs/[...slug].astro      # fumadocs docs page
    sitemap.xml.ts            # static sitemap: home, blog, decks, docs
    api/search.json.ts        # fumadocs static search index
    og/blog/[slug]/image.png.ts    # per-post OG card (takumi-js, 1200x630)
    og/docs/[...slug]/image.webp.ts # per-doc OG card
  components/
    layout.astro              # head/meta/JSON-LD shell (section 2)
    WaitlistForm.tsx          # waitlist island (section 4)
    LangSelect.tsx            # language island (see i18n_platform skill)
    docs.tsx                  # fumadocs DocsLayout wrapper
    search.tsx                # fumadocs search dialog island
  lib/
    blog-pipeline.ts          # the ONE markdown pipeline (section 6)
    slides.ts                 # splitSlides: blog html + slides html
    remark-slide-fences.ts    # :::slide -> <div class="slide-block">
    source.ts                 # fumadocs docs loader + OG helpers
    og.ts                     # clampText + OG_* color consts
content/
  blog/<slug>.md              # posts (frontmatter: title, date, description, youtube?, draft?)
  docs/...                    # docs pages + meta files
src/content.config.ts         # astro content collections: docs, meta, blog (zod schemas)
public/                       # robots.txt, _headers, katex.min.css, fonts, og.png,
                              # favicon.svg, favicon-32.png, apple-touch-icon.png,
                              # logo-mark.png, logo-wordmark.png, blog/, demo/ (web planner),
                              # app/{mobile,desktop}/*.webp (generated, see below)
BLOG.md                       # the blog/slides authoring contract (read before writing a post)
n8n/                          # waitlist endpoint contract (section 4); real automation JSON
```

## 2. Meta and SEO layer (layout.astro)

`src/components/layout.astro` is the single head builder. Pages pass props:
`title`, `description`, `canonical` (defaults derive from Astro.url), `ogImage`,
`ogType` (defaults "website"; blog passes "article"), a `schema` prop for extra
JSON-LD nodes, and slot content. Defaults sit in the frontmatter consts; a page that
forgets a description gets the sitewide default, which is wrong for that page:
ALWAYS pass a real one.

The layout emits, verified at authoring time:

- Title (page prop or the default "excited.live -- Plan the life you want to
  live"; the product title string itself contains a spaced dash, keep it as-is
  when quoting), description, canonical (`new URL(Astro.url.pathname, site)` where
  site is Astro.site or https://excited.live), OG title/description/url, og:image
  with 1200x630 size meta (default `/og.png`, blog passes the per-post card),
  og:type/site_name, twitter card/title/description/image, theme-color, favicons,
  and the Sofia Sans font preconnect + stylesheet.
- The sitewide JSON-LD `@graph` in one inline script: an Organization node
  (`@id: https://excited.live/#org`, name FromSukong, url https://fromsukong.com,
  logo, sameAs Instagram + GitHub), a WebSite node (`@id: .../#website`, name
  excited.live, description, publisher back-ref to the org, inLanguage ["en",
  "th"]), then any extra nodes passed via the `schema` prop (single object or
  array; blog posts pass a BlogPosting with headline, datePublished, author
  Organization FromSukong, publisher `@id` back-ref, and the post OG image URL).
  Structured-data rule: every `@id` must resolve to a real page URL or anchor;
  never emit a dangling one.
- The GA4 shim (section 3), the cookie-consent banner (GA initializes ONLY after
  Accept, choice stored as `exl-consent` in localStorage; page_view counted per
  route through the ClientRouter `astro:page-load` hook), and the language boot
  script that sets `<html data-lang>` from `localStorage['exl-lang']` BEFORE first
  paint (flash-free language restore; keep the `data-lang-en` / `data-lang-th`
  span pairs intact pair-by-pair when editing copy).

Where meta regressions hide:

- A new page added WITHOUT `<Layout ...>` loses canonical, OG tags, and JSON-LD all
  at once. Always wrap in Layout and pass title PLUS description explicitly.
- OG image paths must point at the generated routes: `/og/blog/[slug]/image.png`
  (1200x630 PNG), `/og/docs/[...slug]/image.webp` (takumi-js ImageResponse via
  fumadocs' default template with clamped title/description). A missing file
  renders as a broken share card.
- The `data-lang` spans (EN/TH copy pairs) live inside `<Layout>` children (see the
  boot-script bullet above).

## 3. The `PUBLIC_*` env pattern and the GA shim

Landing uses Astro's `import.meta.env.PUBLIC_*` convention: only vars prefixed
`PUBLIC_` reach client bundles. `src/env.d.ts` (plus ambient Window typing) declares
the GA shim: `window.gtag` and `window.dataLayer` may be undefined everywhere
except production.

GA4 shim behavior, verified in layout.astro: the measurement id is hardcoded in the
layout (a public id, safe by design in client bundles); the loader script is emitted
ONLY when `location.hostname === "excited.live"` (previews, prelive, and localhost
render without GA), and even then only after the visitor accepts the cookie
consent banner (choice stored as `exl-consent`; the banner exposes `window.__exlGaLoad`
and re-plays the page_view on consent). `page_view` is counted per route because the
ClientRouter serves client-side navigations (`astro:page-load`). The waitlist and
language islands fire `generate_lead` and `lang_toggle` events via `window.gtag?.()`,
which are no-ops wherever GA never loaded. Nothing breaks where GA is absent.

## 4. The waitlist flow (WaitlistForm.tsx)

The form posts to the n8n webhook:

```ts
const WEBHOOK_URL = import.meta.env.PUBLIC_N8N_WAITLIST_WEBHOOK ?? "https://n8n.fromsukong.com/webhook/waitlist"
```

(Env var name only; the value is real infrastructure and never committed.)

Behavior, verified in the component:

- Honeypot field `company_website` (hidden via aria-hidden and tabIndex -1). A bot
  that fills it silently gets status "success" with NO backend touch.
- Client email validation; invalid input shows `invalidEmail` message.
- POSTs JSON `{ email, lang, source ("hero"|"footer"), page: location.pathname,
  sentAt }` with Content-Type application/json.
- On success shows the success card (plus `gtag?.("event", "generate_lead", ...)`
  where GA is loaded).
- On fetch failure the email is saved to localStorage under `exl-waitlist-local`
  (deduplicated) and the error card explains the on-device fallback. Nobody is lost
  when n8n is down.

The endpoint contract, CORS allowlist, and what activating the workflow means live in
`apps/landingpage/n8n/README.md` (sheet columns, 200/400 shapes, allowlist includes
prod, prelive, preview origins, and localhost dev). The workflow JSON
(`n8n/waitlist-workflow.json`) is REAL infra: never edit it from a UI PR; changes go
through the automation owner.

## 5. Sitemap, robots, headers

- `src/pages/sitemap.xml.ts` builds the XML by hand: home, /blog/, each non-draft
  post (`/blog/<id>/`), each post's deck (`/blog/<id>/slides/`) when it has slides
  (same `splitSlides` logic as the page, so a post with zero decks does not get a
  dead slides URL), and every docs page. Served at /sitemap.xml; robots.txt points
  at `https://excited.live/sitemap.xml`.
- `public/robots.txt`: allow all, plus the sitemap line. Keep both files in sync
  when adding a new top-level route.
- `public/_headers`: static Cloudflare Pages headers (X-Frame-Options DENY,
  nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy,
  HSTS includeSubDomains). Mirrors the other apps' baseline; extend, never remove.

## 6. Content pipeline (BLOG.md is the contract)

One markdown file, two outputs, never duplicating each other (BLOG.md states this as
a content rule, meaning it):

```text
content/blog/<slug>.md
  frontmatter: title, date (YYYY-MM-DD), description (used on /blog AND in meta),
               youtube? (11-char id, embeds the video at top), draft? (true = hidden)
  prose        -> /blog/<slug>/          (deck beats STRIPPED)
  :::slide     -> /blog/<slug>/slides    (built ONLY from marked blocks)
```

- `src/lib/blog-pipeline.ts` exports the shared remark/rehype lists and
  `renderBlogMarkdown()`. Because both the blog page and the slides page render
  through this one pipeline, the HTML the slides splitter reads is guaranteed to
  match the blog. Order matters: rehypeKatex MUST run before fumadocs rehypeCode, or
  shiki claims the `$$` math blocks. Inline single-$ math is intentionally OFF (a
  finance blog writes "$500 ... $600" in prose): use `$$...$$` for math, and in
  prose write currency amounts as plain text with markdown italics.
- `splitSlides(renderedHtml)` returns `{ blogHtml, slidesHtml, slideCount }`; the
  blog strips slide blocks, the slides page builds deck cards. After adding a post,
  read BOTH pages (`/blog/<slug>/` and `/blog/<slug>/slides`) to check no echo.
- `src/content.config.ts` zod schemas enforce frontmatter (docs need title; meta
  collection holds optional title/description/pages/icon for the docs tree; blog
  needs title + date, optional description/youtube/draft).

## 6b. App screenshots (generated, do not hand-edit)

`public/app/{mobile,desktop}/*.webp` are real screens of `apps/biz-mobile` rendered with
marketing demo data (`apps/biz-mobile/src/testing/landing-fixtures.ts`). One config
captures both form factors; the second step converts PNG to WebP:

```bash
pnpm capture:landing    # biz-mobile Playwright (capture-mobile + capture-desktop) -> optimize
```

Set `PW_CT_PORT=<free port>` if another checkout already holds the gallery on 5174
(Playwright would silently reuse that server and render the wrong code). The landing
copy that quotes demo numbers (before/after toggle, hero chips) mirrors the fixtures:
change both together.

## 7. Commands

```bash
# What CI runs for this app
pnpm --filter @excited-live/landingpage build       # astro build
pnpm --filter @excited-live/landingpage typecheck   # astro check
pnpm --filter @excited-live/landingpage preview     # astro preview (serves dist)

# CI builds through turbo so workspace deps prebuild in order:
pnpm exec turbo run build --filter=@excited-live/landingpage
```

Verified at authoring time: build completes in ~16s locally (9 pages);
`astro check` reports 0 errors / 0 warnings / 19 hints on the current main. The hints
are pre-existing; keep that baseline (an edit that adds new errors or warnings is a
bounce).

## 8. Previews and paths

The landing preview workflow (`.github/workflows/landing-preview.yml`) triggers on
PRs touching `apps/landingpage/**`, `pnpm-lock.yaml`, `turbo.json`, or
`landing-*.yml` workflows; builds via turbo; deploys to the Cloudflare Pages project
`excited-live-landing-preview` under a sanitized branch alias
(lowercase, non-[a-z0-9-] chars replaced, truncated to 23 chars) and comments the
`https://<alias>.excited-live-landing-preview.pages.dev` URL on the PR. Alias
length limits and the shared sanitize rules are documented in the `deployment_ci`
skill; the same 23-char truncation applies because the same sanitized alias form is
reused. Preview URLs are ephemeral per branch; do not cite them as permanent.

## 9. Pitfalls

- The n8n workflow JSON is real infra: do not edit, rename, or reformat it from a
  landing PR.
- GA loads only on the production hostname. A "my event never fires in preview" bug
  report is usually the shim working as designed: verify on production, or trust the
  code path + typecheck.
- Do not commit real webhook URLs past the hardcoded production default already in
  WaitlistForm.tsx (that one is deliberate infrastructure): new endpoints go in env
  vars via the PUBLIC_ pattern, names only in code.
- Meta regressions hide behind Layout defaults: any new page MUST pass title and
  description explicitly, or it ships the sitewide default (section 2).
- When adding a route, also touch sitemap.xml.ts AND robots-based references where
  needed; the sitemap only lists what it knows.
- Deck-only copy leaking into the blog (or vice versa) is a BLOG.md bug class: after
  a content change, read both outputs and confirm no echo.
- Alias length limits: branch names longer than 23 sanitize-truncated chars collide;
  check the deployment_ci skill's sanitize section before adding long branch names.
