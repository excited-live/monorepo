import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PW_CT_PORT lets a second checkout/worktree run its own gallery instead of
// silently reusing another checkout's dev server on 5174.
const port = Number(process.env.PW_CT_PORT ?? 5174);
const baseURL = `http://127.0.0.1:${port}/playwright/gallery/index.html`;

// Landing-page marketing shots (`pnpm capture:landing`). One switch turns on a
// mobile + desktop project pair so a single run captures both form factors.
// Off by default so `pnpm test:visual` never rewrites landing assets.
const captureProjects = process.env.CAPTURE_LANDING
	? [
			{
				name: "capture-mobile",
				testMatch: /.*\.capture\.spec\.tsx?$/,
				// First run after a fixture edit can race Vite's dep re-optimisation.
				retries: 1,
				use: {
					...devices["iPhone 14"],
					defaultBrowserType: "chromium" as const,
					deviceScaleFactor: 2,
					baseURL,
					serviceWorkers: "block" as const,
					reuseContext: true,
				},
			},
			{
				name: "capture-desktop",
				testMatch: /.*\.capture\.spec\.tsx?$/,
				// First run after a fixture edit can race Vite's dep re-optimisation.
				retries: 1,
				use: {
					...devices["Desktop Chrome"],
					viewport: { width: 1280, height: 800 },
					deviceScaleFactor: 2,
					baseURL,
					serviceWorkers: "block" as const,
					reuseContext: true,
				},
			},
		]
	: [];

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
			omitBackground: false,
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
			name: "mobile-component",
			testMatch: /.*(?<!\.page|\.capture)\.spec\.tsx?$/,
			use: {
				...devices["iPhone 14"],
				defaultBrowserType: "chromium",
				baseURL,
				serviceWorkers: "block",
				reuseContext: true,
			},
		},
		...captureProjects,
	],
	webServer: {
		command: `pnpm exec vite --config vite.config.ct.ts --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		cwd: __dirname,
		timeout: 60000,
	},
});
