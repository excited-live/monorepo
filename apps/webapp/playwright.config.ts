import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	testDir: "./src",
	testMatch: ["**/*.spec.tsx", "**/*.spec.ts"],
	snapshotPathTemplate:
		"{testDir}/{testFileDir}/__snapshots__/{testFileName}/{arg}{ext}",
	timeout: 30000,
	expect: {
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.02,
			animations: "disabled",
			// @ts-expect-error Playwright supports omitBackground in config at runtime but omits it in its types
			omitBackground: true,
		},
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],
	projects: [
		{
			name: "component",
			testMatch: /.*(?<!\.page)\.spec\.tsx?$/,
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://127.0.0.1:5173/playwright/gallery/index.html",
				serviceWorkers: "block",
				reuseContext: true,
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "page-desktop",
			testMatch: /.*\.page\.spec\.tsx?$/,
			use: {
				...devices["Desktop Chrome"],
				baseURL: "http://127.0.0.1:5173/playwright/gallery/index.html",
				serviceWorkers: "block",
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "page-mobile",
			testMatch: /.*\.page\.spec\.tsx?$/,
			use: {
				...devices["iPhone 14"],
				baseURL: "http://127.0.0.1:5173/playwright/gallery/index.html",
				serviceWorkers: "block",
			},
		},
	],
	webServer: {
		command: "pnpm exec vite --config vite.config.ct.ts --port 5173",
		url: "http://127.0.0.1:5173/playwright/gallery/index.html",
		reuseExistingServer: !process.env.CI,
		cwd: __dirname,
		timeout: 30000,
	},
})
