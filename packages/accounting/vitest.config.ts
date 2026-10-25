import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// The book adapter round trip builds and compares whole engine snapshots;
		// it hit 6137 ms on the self-hosted CI runner on 2026-10-25 under load.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
})
