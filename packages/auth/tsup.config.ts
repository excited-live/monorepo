import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/client.ts", "src/tanstack-start.ts", "src/flow.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
});
