/**
 * Agent catalog and prompt builders for AI-native onboarding.
 *
 * Pure data + pure string builders: no React, no I/O, no locale services. Every
 * prompt is short and copy-paste ready because users paste it into an agent by
 * hand. Config formats are verified against each client's docs; anything that
 * could not be verified uses the generic "remote Streamable-HTTP MCP server"
 * wording on purpose.
 */

export type AgentKind = "coding" | "chat" | "cloud";
export type AgentAuth = "apiKey" | "oauth" | "device";

/** How the API-key prompt tells the agent to install the server. */
export type AgentPromptStyle = "claude-code" | "codex" | "cursor" | "opencode" | "gemini-cli" | "generic";

export interface AgentOption {
	id: string;
	/** Product name (a proper noun; not translated). */
	name: string;
	kind: AgentKind;
	featured: boolean;
	/** Supported sign-in methods; the first one is the default. */
	auth: AgentAuth[];
	/** Stable key for the monogram shown on the agent card. */
	iconKey: string;
	/** Config format used by the API-key prompt. */
	promptStyle: AgentPromptStyle;
	/** Dictionary keys for the numbered connector steps (chat apps only). */
	setupStepKeys?: string[];
}

/** The six featured agents, in slider order. */
export const FEATURED_AGENTS: readonly AgentOption[] = [
	{
		id: "claude-code",
		name: "Claude Code",
		kind: "coding",
		featured: true,
		auth: ["apiKey", "oauth"],
		iconKey: "claude-code",
		promptStyle: "claude-code",
	},
	{
		id: "codex",
		name: "Codex",
		kind: "coding",
		featured: true,
		auth: ["apiKey", "oauth"],
		iconKey: "codex",
		promptStyle: "codex",
	},
	{
		id: "cursor",
		name: "Cursor",
		kind: "coding",
		featured: true,
		auth: ["apiKey", "oauth"],
		iconKey: "cursor",
		promptStyle: "cursor",
	},
	{
		id: "claude",
		name: "Claude",
		kind: "chat",
		featured: true,
		auth: ["oauth"],
		iconKey: "claude",
		promptStyle: "generic",
		setupStepKeys: ["agent.setup.claude.1", "agent.setup.claude.2", "agent.setup.claude.3"],
	},
	{
		id: "chatgpt",
		name: "ChatGPT",
		kind: "chat",
		featured: true,
		auth: ["oauth"],
		iconKey: "chatgpt",
		promptStyle: "generic",
		setupStepKeys: ["agent.setup.chatgpt.1", "agent.setup.chatgpt.2", "agent.setup.chatgpt.3"],
	},
	{
		id: "hermes",
		name: "Hermes",
		kind: "cloud",
		featured: true,
		auth: ["device", "apiKey"],
		iconKey: "hermes",
		promptStyle: "generic",
	},
];

/** Everything else, shown behind the More button. */
export const MORE_AGENTS: readonly AgentOption[] = [
	{
		id: "opencode",
		name: "OpenCode",
		kind: "coding",
		featured: false,
		auth: ["apiKey", "oauth"],
		iconKey: "opencode",
		promptStyle: "opencode",
	},
	{
		id: "gemini-cli",
		name: "Gemini CLI",
		kind: "coding",
		featured: false,
		auth: ["apiKey", "oauth"],
		iconKey: "gemini-cli",
		promptStyle: "gemini-cli",
	},
	{
		id: "antigravity",
		name: "Antigravity",
		kind: "coding",
		featured: false,
		auth: ["apiKey"],
		iconKey: "antigravity",
		promptStyle: "generic",
	},
	{
		id: "windsurf",
		name: "Windsurf",
		kind: "coding",
		featured: false,
		auth: ["apiKey"],
		iconKey: "windsurf",
		promptStyle: "generic",
	},
	{
		id: "vscode",
		name: "VS Code (Copilot)",
		kind: "coding",
		featured: false,
		auth: ["apiKey"],
		iconKey: "vscode",
		promptStyle: "generic",
	},
	{
		id: "cline",
		name: "Cline",
		kind: "coding",
		featured: false,
		auth: ["apiKey"],
		iconKey: "cline",
		promptStyle: "generic",
	},
	{
		id: "zed",
		name: "Zed",
		kind: "coding",
		featured: false,
		auth: ["apiKey"],
		iconKey: "zed",
		promptStyle: "generic",
	},
	{
		id: "other-mcp",
		name: "Other MCP client",
		kind: "coding",
		featured: false,
		auth: ["apiKey", "oauth"],
		iconKey: "other-mcp",
		promptStyle: "generic",
	},
	{
		id: "other-cloud",
		name: "Other cloud agent",
		kind: "cloud",
		featured: false,
		auth: ["device", "apiKey"],
		iconKey: "other-cloud",
		promptStyle: "generic",
	},
];

export const AGENT_OPTIONS: readonly AgentOption[] = [...FEATURED_AGENTS, ...MORE_AGENTS];

export const AGENT_KINDS: readonly AgentKind[] = ["coding", "chat", "cloud"];

export function getAgentById(id: string): AgentOption | undefined {
	return AGENT_OPTIONS.find((agent) => agent.id === id);
}

export function getAgentName(id: string): string {
	return getAgentById(id)?.name ?? id;
}

/**
 * Sign-in methods that can actually run here. Chat/device links need the
 * webapp origin; without it those options are hidden instead of failing.
 */
export function availableAgentAuth(agent: AgentOption, webappUrl: string | null): AgentAuth[] {
	return agent.auth.filter((auth) => auth === "apiKey" || webappUrl !== null);
}

/** The option preselected in the auth picker (first supported, first overall). */
export function defaultAgentAuth(agent: AgentOption, webappUrl: string | null): AgentAuth {
	return availableAgentAuth(agent, webappUrl)[0] ?? agent.auth[0] ?? "apiKey";
}

export type AgentPromptAuth =
	/** `key: null` is the dev passthrough: render no Authorization header at all. */
	| { kind: "apiKey"; key: string | null }
	| { kind: "oauth" }
	| { kind: "device"; webappUrl: string };

export interface BuildAgentPromptArgs {
	agent: AgentOption;
	mcpUrl: string;
	/** Language name the agent should reply in, e.g. "Thai". */
	lang: string;
	auth: AgentPromptAuth;
}

interface ConfigPromptArgs {
	mcpUrl: string;
	/** Full header line, for CLI flags and prose. */
	header: string | null;
	/** Header value only (`Bearer …`), for config maps. */
	authValue: string | null;
	/** Keyless dev passthrough: no header and no sign-in step. */
	keyless?: boolean;
	lang: string;
}

const guide = (lang: string) =>
	`call get_onboarding_status (or run the onboard_me prompt) and follow the server's guide. Talk to me in ${lang}.`;

const signIn = (authValue: string | null, keyless = false) =>
	authValue || keyless ? [] : ["Sign in when your client opens the browser."];

const configPrompts: Record<Exclude<AgentPromptStyle, "generic">, (args: ConfigPromptArgs) => string> = {
	"claude-code": ({ mcpUrl, header, keyless, lang }) =>
		[
			"Add the excited.live MCP server, then help me set up my books.",
			"",
			"Run:",
			`claude mcp add --transport http excited-live ${mcpUrl}${header ? ` --header "${header}"` : ""}`,
			"",
			...signIn(header, keyless),
			`Reload your tools, then ${guide(lang)}`,
		].join("\n"),
	codex: ({ mcpUrl, authValue, keyless, lang }) =>
		[
			"Add this MCP server to ~/.codex/config.toml, then help me set up my books.",
			"",
			"[mcp_servers.excited-live]",
			`url = "${mcpUrl}"`,
			...(authValue ? [`http_headers = { Authorization = "${authValue}" }`] : []),
			"",
			...signIn(authValue, keyless),
			`Restart Codex, then ${guide(lang)}`,
		].join("\n"),
	cursor: ({ mcpUrl, authValue, keyless, lang }) =>
		[
			"Add this MCP server to ~/.cursor/mcp.json, then help me set up my books.",
			"",
			"{",
			'  "mcpServers": {',
			'    "excited-live": {',
			`      "url": "${mcpUrl}"${authValue ? "," : ""}`,
			...(authValue ? [`      "headers": { "Authorization": "${authValue}" }`] : []),
			"    }",
			"  }",
			"}",
			"",
			...signIn(authValue, keyless),
			`Reload MCP servers, then ${guide(lang)}`,
		].join("\n"),
	opencode: ({ mcpUrl, authValue, keyless, lang }) =>
		[
			"Add this to opencode.json, then help me set up my books.",
			"",
			"{",
			'  "mcp": {',
			'    "excited-live": {',
			'      "type": "remote",',
			`      "url": "${mcpUrl}",`,
			`      "enabled": true${authValue ? "," : ""}`,
			...(authValue ? [`      "headers": { "Authorization": "${authValue}" }`] : []),
			"    }",
			"  }",
			"}",
			"",
			...(authValue || keyless ? [] : ["Authenticate with `opencode mcp auth excited-live`."]),
			`Reload your tools, then ${guide(lang)}`,
		].join("\n"),
	"gemini-cli": ({ mcpUrl, authValue, keyless, lang }) =>
		[
			"Add this MCP server to ~/.gemini/settings.json, then help me set up my books.",
			"",
			"{",
			'  "mcpServers": {',
			'    "excited-live": {',
			`      "httpUrl": "${mcpUrl}"${authValue ? "," : ""}`,
			...(authValue ? [`      "headers": { "Authorization": "${authValue}" }`] : []),
			"    }",
			"  }",
			"}",
			"",
			...signIn(authValue, keyless),
			`Restart Gemini CLI, then ${guide(lang)}`,
		].join("\n"),
};

export function buildAgentPrompt({ agent, mcpUrl, lang, auth }: BuildAgentPromptArgs): string {
	if (auth.kind === "device") {
		return [
			"Connect to excited.live and help me set up my books.",
			"",
			`1. POST ${auth.webappUrl}/api/auth/device/code with client_id=excited-live-agent.`,
			"2. Send me the verification_uri_complete link from the response.",
			`3. Poll ${auth.webappUrl}/api/auth/device/token every 5 seconds with grant_type=urn:ietf:params:oauth:grant-type:device_code, device_code and client_id=excited-live-agent until you get an access token.`,
			`4. Add the MCP server ${mcpUrl} with the header "Authorization: Bearer <access token>", reload your tools, then call get_onboarding_status and follow the server's guide.`,
			"",
			`Talk to me in ${lang}.`,
		].join("\n");
	}

	if (auth.kind === "oauth") {
		if (agent.kind === "chat") {
			return `Use the excited.live connector (MCP server at ${mcpUrl}), then help me set up my books. Call get_onboarding_status and follow the server's guide. Talk to me in ${lang}.`;
		}
		if (agent.promptStyle === "generic") {
			return `Add a remote Streamable-HTTP MCP server named "excited-live" at ${mcpUrl}. Sign in when the browser opens and reload your tools, then ${guide(lang)}`;
		}
		return configPrompts[agent.promptStyle]({ mcpUrl, header: null, authValue: null, lang });
	}

	const keyless = auth.key === null;
	const authValue = auth.key ? `Bearer ${auth.key}` : null;
	const header = authValue ? `Authorization: ${authValue}` : null;
	if (agent.promptStyle === "generic") {
		return header
			? `Add a remote Streamable-HTTP MCP server named "excited-live" at ${mcpUrl} with the header "${header}". Reload your tools, then ${guide(lang)}`
			: `Add a remote Streamable-HTTP MCP server named "excited-live" at ${mcpUrl}. Reload your tools, then ${guide(lang)}`;
	}
	return configPrompts[agent.promptStyle]({ mcpUrl, header, authValue, keyless, lang });
}
