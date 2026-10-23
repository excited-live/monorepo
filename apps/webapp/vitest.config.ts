import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		// Unit tests only; component/page visual tests are Playwright specs.
		include: ["src/**/*.test.ts"],
	},
})
