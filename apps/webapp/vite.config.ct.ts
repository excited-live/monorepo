import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	root: __dirname,
	server: {
		// Bind IPv4 explicitly. Vite's "localhost" default resolves to ::1 on
		// the GitHub runner, so the gallery comes up but 127.0.0.1 -- what
		// Playwright polls in webServer.url -- refuses the connection.
		host: "127.0.0.1",
		port: 5173,
		strictPort: true,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [viteReact()],
})
