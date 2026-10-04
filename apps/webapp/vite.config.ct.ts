import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	root: __dirname,
	server: {
		port: 5173,
		strictPort: true,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [viteReact()],
})
