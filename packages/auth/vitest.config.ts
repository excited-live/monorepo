import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Better Auth sign-up/sign-in boots a server and a migrated SQLite DB; this
		// suite hit 5084 ms on the self-hosted CI runner on 2026-10-25.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
})
