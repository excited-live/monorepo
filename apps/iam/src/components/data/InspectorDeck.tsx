import { useState } from "react"
import type { Endpoint } from "../../generated/endpoints"
import { curlSnippet, mcpToolCallSnippet, sdkSnippet, type CallShape } from "../../lib/snippets"
import { MCP_HINTS, SDK_HINTS } from "../../lib/mappings"
import { CodeDeck } from "../CodeDeck"

type DeckTab = "curl" | "sdk" | "mcp"

/**
 * "What just happened?" — three views of the same call.
 *
 * cURL is the request the browser actually made (same origin, same token);
 * SDK names the package function that computes the same result locally; MCP
 * shows the JSON-RPC frame an agent sends instead. When an endpoint has no MCP
 * tool or no pure package function, the deck says so — it never invents one.
 */
export function InspectorDeck({ endpoint, call }: { endpoint: Endpoint; call: CallShape & { body?: Record<string, unknown> } }) {
	const [tab, setTab] = useState<DeckTab>("curl")

	const sdk = SDK_HINTS[endpoint.id] ?? null
	const mcp = MCP_HINTS[endpoint.id] ?? null

	const code =
		tab === "curl"
			? curlSnippet(call)
			: tab === "sdk"
				? sdkSnippet(sdk, call)
				: mcp
					? mcpToolCallSnippet(mcp, call.body ?? {})
					: `// No MCP tool exposes ${endpoint.method} ${endpoint.path} yet.\n// Agents reach this data through the tools listed in the registry:\n//   get_onboarding_status, list_entities, create_business, add_asset,\n//   add_liability, add_income, add_expense, lookup_catalog,\n//   complete_onboarding_step, skip_onboarding_step, get_financial_summary`

	return (
		<aside className="inspector" data-panel aria-label="Request inspector">
			<div className="inspector-head">
				<div className="row spread">
					<h3>What just happened?</h3>
					{mcp ? <span className="badge ok">MCP tool</span> : <span className="badge">REST only</span>}
				</div>
				<div className="segmented" role="tablist" aria-label="Inspector view">
					<button type="button" role="tab" aria-selected={tab === "curl"} onClick={() => setTab("curl")}>cURL</button>
					<button type="button" role="tab" aria-selected={tab === "sdk"} onClick={() => setTab("sdk")}>SDK</button>
					<button type="button" role="tab" aria-selected={tab === "mcp"} onClick={() => setTab("mcp")}>MCP tool call</button>
				</div>
			</div>
			<div className="inspector-body">
				<CodeDeck
					code={code}
					label={tab === "curl" ? "direct HTTP · no BFF" : tab === "sdk" ? "package function" : "JSON-RPC 2.0"}
					wrap
				/>
				<p className="note">
					{tab === "curl"
						? "This is the exact request the page sent: browser → API origin, bearer token, no proxy in between."
						: tab === "sdk"
							? sdk
								? `${sdk.pkg} exports ${sdk.fn}. Running it locally skips the round trip; the API runs the same code.`
								: "This capability is a server-side store today, so there is no pure package function to import."
							: mcp
								? `Agents call ${mcp.tool} and never see this REST shape.`
								: "Only the onboarding and accounting suites are exposed over MCP so far."}
				</p>
				{endpoint.response ? (
					<p className="tiny muted" style={{ margin: 0 }}>
						Response schema: <span className="mono">{endpoint.response}</span> · documented status {endpoint.status}
					</p>
				) : null}
			</div>
		</aside>
	)
}
