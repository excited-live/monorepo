import type { McpHint, SdkHint } from "./snippets"

/**
 * Curated mapping from an API endpoint to the two "where does this live"
 * answers in the inspector deck.
 *
 * Both sides are verified against the repo, not aspirational:
 *  - `sdk` names real exports of `@excited-live/accounting`, `@excited-live/sim`
 *    or `@excited-live/tax` (see each package's index.ts).
 *  - `mcp` names tools registered in `apps/api/src/modules/mcp/tools/*.tools.ts`.
 * An endpoint without an entry is shown as server-only / REST-only, which is
 * accurate — only the onboarding + accounting suites are exposed over MCP today.
 */
export const SDK_HINTS: Record<string, SdkHint> = {
	"get-api-v1-accounting-summary": {
		pkg: "@excited-live/accounting",
		fn: "calculateConsolidatedWealthMetrics",
		note: "Pure wealth metrics from the same ledger snapshot the endpoint read.",
	},
	"get-api-v1-accounting-projection": {
		pkg: "@excited-live/accounting",
		fn: "calculateProjectionBalances",
		note: "Treasury balance per month around a centre month.",
	},
	"get-api-v1-catalog-suggest": {
		pkg: "@excited-live/accounting",
		fn: "searchCatalog",
		note: "Same catalog search the API runs; no round trip needed.",
	},
	"post-api-v1-catalog-resolve": {
		pkg: "@excited-live/accounting",
		fn: "resolveCatalogAmount",
		note: "Normalises a catalog hit into an amount + cycle.",
	},
}

/** REST body → MCP tool arguments. Tools take the same field names as the body. */
const passthrough = (body: Record<string, unknown>): Record<string, unknown> => body

export const MCP_HINTS: Record<string, McpHint> = {
	"get-api-v1-onboarding": { tool: "get_onboarding_status", map: () => ({}) },
	"put-api-v1-onboarding": { tool: "complete_onboarding_step", map: passthrough },
	"get-api-v1-accounting-entities": { tool: "list_entities", map: () => ({}) },
	"post-api-v1-accounting-entities": { tool: "create_business", map: passthrough },
	"post-api-v1-accounting-assets": { tool: "add_asset", map: passthrough },
	"post-api-v1-accounting-liabilities": { tool: "add_liability", map: passthrough },
	"post-api-v1-accounting-incomes": { tool: "add_income", map: passthrough },
	"post-api-v1-accounting-expenses": { tool: "add_expense", map: passthrough },
	"get-api-v1-accounting-summary": { tool: "get_financial_summary", map: () => ({}) },
	"get-api-v1-catalog-suggest": { tool: "lookup_catalog", map: passthrough },
	"get-api-v1-accounting-cash-flows": { tool: "get_cash_flows", map: passthrough },
	"get-api-v1-accounting-transfers": { tool: "list_transfers", map: () => ({}) },
	"post-api-v1-accounting-transfers": { tool: "create_transfer", map: passthrough },
	"get-api-v1-accounting-ledger-yearMonth": { tool: "get_monthly_ledger", map: passthrough },
	"get-api-v1-accounting-projection": { tool: "get_treasury_projection", map: passthrough },
}

/** Scopes a key needs, matching AGENT_KEY_PERMISSIONS in apps/api. */
export const ENDPOINT_SCOPES: Record<string, string> = {
	onboarding: "onboarding:read",
	accounting: "accounting:read",
	catalog: "accounting:read",
	settings: "settings:read",
	auth: "keys:manage",
	system: "public",
}

/** Scope implied by an endpoint's tag (read by the Tokens tab). */
export function scopeForTag(tag: string): string {
	return ENDPOINT_SCOPES[tag.toLowerCase()] ?? "accounting:read"
}
