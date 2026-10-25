import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// The Monte Carlo determinism test runs a full simulation path; it hit
		// 9386 ms on the self-hosted CI runner on 2026-10-25, over vitest's 5 s default.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
})
