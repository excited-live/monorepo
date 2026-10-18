import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const DESIGN_SYSTEM_HINT =
	"Raw HTML is not allowed in app code. Use a component instead: Astryx components or primitives from @excited-live/design-system (Box, Text, Heading, PlainButton, Svg/SvgLine/SvgPath, SvgIcon, AppDocument). If no primitive fits, add one to packages/design-system.";

/**
 * Elements forbidden in apps/webapp — everything a page needs must come from
 * the design system. packages/design-system itself is the allowed home for
 * raw elements.
 */
const FORBIDDEN_HTML = [
	"html",
	"head",
	"body",
	"div",
	"span",
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"main",
	"header",
	"footer",
	"section",
	"nav",
	"aside",
	"article",
	"button",
	"a",
	"ul",
	"ol",
	"li",
	"img",
	"form",
	"label",
	"input",
	"select",
	"textarea",
	"table",
	"svg",
	"path",
	"line",
	"circle",
	"rect",
].map((element) => ({ element, message: DESIGN_SYSTEM_HINT }));

export default tseslint.config(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.astro/**",
			"**/.turbo/**",
			"**/.output/**",
			"**/.tanstack/**",
			"**/.verify/**",
			"**/routeTree.gen.ts",
			"**/*.cjs",
			"**/src-tauri/target/**",
			"**/src-tauri/gen/android/**",
			"**/playwright-report/**",
			"**/test-results/**",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { "react-hooks": reactHooks },
		rules: {
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["apps/webapp/src/**/*.{ts,tsx}"],
		plugins: { react },
		rules: {
			"react/forbid-elements": ["error", { forbid: FORBIDDEN_HTML }],
		},
	},
);
