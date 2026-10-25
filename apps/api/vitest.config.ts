import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// These suites boot the Worker app, a Better Auth authorization server and
		// a migrated SQLite database per test. The 5 s default is tight on the
		// self-hosted CI runner: oauth.test.ts hit 5007 ms on 2026-10-25.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
})
