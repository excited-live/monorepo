import { defineConfig } from "vitest/config"

// Same 20 s default as the other packages: the self-hosted CI runner has timed
// out 5 s integration tests in four different packages on 2026-10-25.
export default defineConfig({
	test: {
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
})
