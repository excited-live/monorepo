export default {
	default: {
		paths: [
			"features/onboarding/**/*.feature",
			"features/account_management/**/*.feature",
			"features/wealth_management/**/*.feature",
		],
		require: [
			"features/steps/**/*.ts",
		],
		requireModule: ["ts-node/register"],
		format: [
			"summary",
			"progress-bar",
			["html", "cucumber-report.html"],
			["json", "cucumber-report.json"],
		],
		formatOptions: {
			snippetInterface: "async-await",
		},
	},
	p0: {
		paths: ["features/**/p0/*.feature"],
		tags: "@P0",
		require: ["features/steps/**/*.ts"],
	},
	p1: {
		paths: ["features/**/p1/*.feature"],
		tags: "@P1",
		require: ["features/steps/**/*.ts"],
	},
	p2: {
		paths: ["features/**/p2/*.feature"],
		tags: "@P2",
		require: ["features/steps/**/*.ts"],
	},
	onboarding: {
		paths: ["features/onboarding/*.feature", "features/**/p0/*onboarding*.feature"],
		tags: "@onboarding",
		require: ["features/steps/**/*.ts"],
	},
	differences: {
		paths: ["features/**/*.feature"],
		tags: "@differences or @delta",
		require: ["features/steps/**/*.ts"],
	},
};
