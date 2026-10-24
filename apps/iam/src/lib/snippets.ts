import { API_URL, MCP_URL } from "./env"

/**
 * The inspector deck's four views of one call.
 *
 * Everything here is a pure function of (endpoint, input, token) so the same
 * text can be unit-tested and copied verbatim: a cURL command a user pastes in
 * a terminal has to be the request the browser just made.
 */

export interface CallShape {
	method: string
	path: string
	body?: unknown
	token?: string | null
}

const TOKEN_PLACEHOLDER = "elk_your_agent_key"

function tokenOf(call: CallShape): string {
	return call.token || TOKEN_PLACEHOLDER
}

function bodyJson(call: CallShape): string | null {
	if (call.body === undefined || call.body === null) return null
	return JSON.stringify(call.body, null, 2)
}

/** `GET /api/v1/...` — what the request line says in the Network tab. */
export function requestLine(call: CallShape): string {
	return `${call.method.toUpperCase()} ${call.path}`
}

export function curlSnippet(call: CallShape): string {
	const lines = [`curl -X ${call.method.toUpperCase()} "${API_URL}${call.path}"`]
	lines.push(`  -H "Authorization: Bearer ${tokenOf(call)}"`)
	const body = bodyJson(call)
	if (body) {
		lines.push('  -H "Content-Type: application/json"')
		lines.push(`  -d '${body.replace(/\n\s*/g, " ")}'`)
	}
	return lines.join(" \\\n")
}

export interface SdkHint {
	/** Package the function comes from. */
	pkg: string
	/** Exported function name. */
	fn: string
	/** Optional note about what the package computes. */
	note?: string
}

/**
 * SDK snippet: the package function that produces the same result locally,
 * which is the honest answer to "what function do you call from your package".
 * `null` means the capability is server-only today (a store, not a pure
 * function) — the deck then says so instead of inventing an import.
 */
export function sdkSnippet(hint: SdkHint | null, call: CallShape): string {
	if (!hint) {
		return [
			"// Server-side only today: this endpoint reads or writes the user's",
			"// stored ledger, so there is no pure package function to import.",
			"// The typed client is the SDK surface:",
			`import type { AppType } from "@excited-live/api"`,
			`// hc<AppType>("${API_URL}").${call.path.replace(/^\/+/, "")}`,
		].join("\n")
	}
	const args = bodyJson(call) ?? "{}"
	return [
		`import { ${hint.fn} } from "${hint.pkg}"`,
		"",
		`const result = ${hint.fn}(${args})`,
		hint.note ? `// ${hint.note}` : "",
	].filter(Boolean).join("\n")
}

export interface McpHint {
	/** Tool name registered in apps/api/src/modules/mcp (real, not invented). */
	tool: string
	/** How the REST body maps onto tool arguments. */
	map: (body: Record<string, unknown>) => Record<string, unknown>
}

/** The exact JSON-RPC frame an MCP client sends for a tool call. */
export function mcpToolCallSnippet(hint: McpHint, body: Record<string, unknown> = {}): string {
	return JSON.stringify(
		{
			jsonrpc: "2.0",
			id: 1,
			method: "tools/call",
			params: { name: hint.tool, arguments: hint.map(body) },
		},
		null,
		2,
	)
}

/**
 * MCP handshake for a new client: the initialize call every transport makes.
 * Shown in the "Direct HTTP" tab so a user can prove the endpoint is alive
 * before wiring a desktop client.
 */
export function mcpCurlSnippet(token: string | null): string {
	return [
		`curl -X POST "${MCP_URL}" \\`,
		`  -H "Authorization: Bearer ${token || TOKEN_PLACEHOLDER}" \\`,
		'  -H "Content-Type: application/json" \\',
		'  -H "Accept: application/json, text/event-stream" \\',
		`  -d '${JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2025-06-18",
				capabilities: {},
				clientInfo: { name: "iam.excited.live", version: "1.0.0" },
			},
		})}'`,
	].join("\n")
}

/** The four client targets in the Overview config card. */
export type McpClientId = "claude" | "cursor" | "openmaus" | "http"

export interface McpClient {
	id: McpClientId
	label: string
	/** File or surface the snippet belongs in. */
	target: string
	language: "json" | "bash"
}

export const MCP_CLIENTS: readonly McpClient[] = [
	{ id: "claude", label: "Claude Desktop", target: "claude_desktop_config.json", language: "json" },
	{ id: "cursor", label: "Cursor", target: ".cursor/mcp.json", language: "json" },
	{ id: "openmaus", label: "OpenMaus", target: "MCP server settings", language: "json" },
	{ id: "http", label: "Direct HTTP", target: "terminal", language: "bash" },
]

/**
 * Ready-to-paste configuration for one client.
 *
 * Claude Desktop's stdio-only config needs the `mcp-remote` bridge (a real,
 * maintained package) to reach a remote streamable-HTTP server; Cursor and
 * OpenMaus accept a URL plus headers directly. No invented `@excited-live/*`
 * bridge package is referenced until one ships.
 */
export function mcpConfig(client: McpClientId, token: string | null): string {
	const key = token || TOKEN_PLACEHOLDER
	if (client === "http") return mcpCurlSnippet(token)
	if (client === "claude") {
		return JSON.stringify(
			{
				mcpServers: {
					"excited-live": {
						command: "npx",
						args: ["-y", "mcp-remote", MCP_URL, "--header", `Authorization: Bearer ${key}`],
					},
				},
			},
			null,
			2,
		)
	}
	return JSON.stringify(
		{
			mcpServers: {
				"excited-live": {
					type: "http",
					url: MCP_URL,
					headers: { Authorization: `Bearer ${key}` },
				},
			},
		},
		null,
		2,
	)
}
