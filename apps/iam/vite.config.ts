import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"

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
	plugins: [viteReact()],
	build: {
		outDir: "dist",
		sourcemap: true,
	},
})
