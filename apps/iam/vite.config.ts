import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, type Plugin } from "vite"
import viteReact from "@vitejs/plugin-react"
import { renderDoorFallback } from "./src/lib/door-facts.ts"

/**
 * #223 — emit the server-rendered key door next to the SPA.
 *
 * A direct upload serves `dist/` as-is, so the no-JS copy of the door has to
 * exist as a file: `dist/tokens.html`, `dist/keys.html` and
 * `dist/sign-in.html` are the built shell with `<main id="door-fallback">`
 * inserted *outside* `#root`. `main.tsx` removes the fallback once React owns
 * the page; `tokens.html` and `keys.html` are written from the same string, so
 * `/keys` is byte-identical to `/tokens` by construction.
 *
 * Flat files, not `dist/<route>/index.html` plus a rewrite: Pages normalises a
 * `.../index.html` destination to `.../` and answers 308, while a plain
 * `<route>.html` file is served at the clean URL with a 200 and needs no rule
 * (see `_redirects`). The text comes from `src/lib/door-facts.ts`, the same
 * module that renders `/tokens.md` and `/keys.md`, so the HTML cannot drift
 * from the markdown. Fail the build rather than ship a page without the facts.
 */
function doorPages(): Plugin {
	let outDir = ""

	return {
		name: "iam-door-pages",
		apply: "build",
		configResolved(config) {
			outDir = resolve(config.root, config.build.outDir)
		},
		closeBundle() {
			const indexHtml = resolve(outDir, "index.html")
			const html = readFileSync(indexHtml, "utf8")
			const marker = '<div id="root"></div>'
			if (!html.includes(marker)) {
				throw new Error(`iam-door-pages: ${marker} is missing from ${indexHtml}`)
			}

			const page = html.replace(marker, `${renderDoorFallback()}\n\t\t${marker}`)
			for (const route of ["tokens", "keys", "sign-in"]) {
				writeFileSync(resolve(outDir, `${route}.html`), page)
			}
		},
	}
}

/**
 * apps/iam — a plain client SPA.
 *
 * No TanStack Start, no server functions, no BFF: the browser calls the single
 * API origin directly (see src/lib/env.ts). Vite only serves and bundles the
 * app; `dist/` is a static asset directory for Cloudflare Pages.
 */
export default defineConfig({
	server: {
		port: 5175,
		strictPort: true,
	},
	preview: {
		port: 4175,
	},
	plugins: [viteReact(), doorPages()],
	build: {
		outDir: "dist",
		sourcemap: true,
	},
})
