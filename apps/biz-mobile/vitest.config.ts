import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		// Same 20 s default as the other packages: the self-hosted CI runner has
		// timed out 5 s integration tests in four packages on 2026-10-25.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
});
