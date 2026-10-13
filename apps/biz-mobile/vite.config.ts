import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [
		TanStackRouterVite({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
	resolve: {
		alias: {
			"~": resolve(import.meta.dirname, "./src"),
		},
	},
	clearScreen: false,
	server: {
		port: 1430,
		strictPort: true,
		host: host || false,
		proxy: {
			// Same-origin API path for local dev: auth headers never cross origins.
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1431,
				}
			: undefined,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	preview: {
		port: 1431,
		strictPort: true,
		proxy: {
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
});
