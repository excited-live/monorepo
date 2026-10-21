import { describe, expect, it } from "vitest";
import {
	AGENT_OPTIONS,
	availableAgentAuth,
	buildAgentPrompt,
	defaultAgentAuth,
	FEATURED_AGENTS,
	getAgentById,
	getAgentName,
	MORE_AGENTS,
} from "./agents";

const MCP_URL = "https://api.excited.live/mcp";
const WEBAPP_URL = "https://app.excited.live";
const KEY = "elk_live_test_key";

const agent = (id: string) => {
	const found = getAgentById(id);
	if (!found) throw new Error(`Missing agent ${id}`);
	return found;
};

describe("agent catalog", () => {
	it("keeps the featured slider in the planned order", () => {
		expect(FEATURED_AGENTS.map((option) => option.id)).toEqual([
			"claude-code",
			"codex",
			"cursor",
			"claude",
			"chatgpt",
			"hermes",
		]);
	});

	it("lists every non-featured agent behind More", () => {
		expect(MORE_AGENTS.map((option) => option.id)).toEqual([
			"opencode",
			"gemini-cli",
			"antigravity",
			"windsurf",
			"vscode",
			"cline",
			"zed",
			"other-mcp",
			"other-cloud",
		]);
		expect(AGENT_OPTIONS).toHaveLength(FEATURED_AGENTS.length + MORE_AGENTS.length);
	});

	it("defaults coding agents to API keys and cloud agents to the device link", () => {
		expect(defaultAgentAuth(agent("claude-code"), WEBAPP_URL)).toBe("apiKey");
		expect(defaultAgentAuth(agent("codex"), WEBAPP_URL)).toBe("apiKey");
		expect(defaultAgentAuth(agent("claude"), WEBAPP_URL)).toBe("oauth");
		expect(defaultAgentAuth(agent("chatgpt"), WEBAPP_URL)).toBe("oauth");
		expect(defaultAgentAuth(agent("hermes"), WEBAPP_URL)).toBe("device");
	});

	it("hides link-based auth when the webapp origin is unset", () => {
		expect(availableAgentAuth(agent("claude-code"), null)).toEqual(["apiKey"]);
		expect(availableAgentAuth(agent("hermes"), null)).toEqual(["apiKey"]);
		expect(availableAgentAuth(agent("claude"), null)).toEqual([]);
		expect(defaultAgentAuth(agent("claude"), null)).toBe("oauth");
	});

	it("resolves names with a raw-id fallback", () => {
		expect(getAgentName("codex")).toBe("Codex");
		expect(getAgentName("removed-agent")).toBe("removed-agent");
	});
});

describe("buildAgentPrompt", () => {
	it("builds the Claude Code install command with a key", () => {
		const prompt = buildAgentPrompt({
			agent: agent("claude-code"),
			mcpUrl: MCP_URL,
			lang: "Thai",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain(`claude mcp add --transport http excited-live ${MCP_URL}`);
		expect(prompt).toContain(`--header "Authorization: Bearer ${KEY}"`);
		expect(prompt).toContain("Talk to me in Thai.");
		expect(prompt).toMatchSnapshot();
	});

	it("drops the header and asks for sign-in on Claude Code OAuth", () => {
		const prompt = buildAgentPrompt({
			agent: agent("claude-code"),
			mcpUrl: MCP_URL,
			lang: "English",
			auth: { kind: "oauth" },
		});
		expect(prompt).not.toContain("Authorization");
		expect(prompt).toContain("Sign in when your client opens the browser.");
		expect(prompt).toMatchSnapshot();
	});

	it("writes the Codex config table", () => {
		const prompt = buildAgentPrompt({
			agent: agent("codex"),
			mcpUrl: MCP_URL,
			lang: "English",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain("[mcp_servers.excited-live]");
		expect(prompt).toContain(`url = "${MCP_URL}"`);
		expect(prompt).toMatchSnapshot();
	});

	it("writes the Cursor mcp.json block", () => {
		const prompt = buildAgentPrompt({
			agent: agent("cursor"),
			mcpUrl: MCP_URL,
			lang: "English",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain("~/.cursor/mcp.json");
		expect(prompt).toContain('"mcpServers"');
		expect(prompt).toMatchSnapshot();
	});

	it("writes the OpenCode remote entry", () => {
		const prompt = buildAgentPrompt({
			agent: agent("opencode"),
			mcpUrl: MCP_URL,
			lang: "Thai",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain('"type": "remote"');
		expect(prompt).toContain("opencode.json");
		expect(prompt).toMatchSnapshot();
	});

	it("writes the Gemini CLI httpUrl entry", () => {
		const prompt = buildAgentPrompt({
			agent: agent("gemini-cli"),
			mcpUrl: MCP_URL,
			lang: "English",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain("~/.gemini/settings.json");
		expect(prompt).toContain('"httpUrl"');
		expect(prompt).toMatchSnapshot();
	});

	it("falls back to generic wording for unverified clients", () => {
		const prompt = buildAgentPrompt({
			agent: agent("windsurf"),
			mcpUrl: MCP_URL,
			lang: "English",
			auth: { kind: "apiKey", key: KEY },
		});
		expect(prompt).toContain('Add a remote Streamable-HTTP MCP server named "excited-live"');
		expect(prompt).toMatchSnapshot();
	});

	it("gives chat apps a short connector prompt", () => {
		const prompt = buildAgentPrompt({
			agent: agent("claude"),
			mcpUrl: MCP_URL,
			lang: "Thai",
			auth: { kind: "oauth" },
		});
		expect(prompt).toContain("excited.live connector");
		expect(prompt).not.toContain("elk_");
		expect(prompt).toMatchSnapshot();
	});

	it("walks a cloud agent through the device flow", () => {
		const prompt = buildAgentPrompt({
			agent: agent("hermes"),
			mcpUrl: MCP_URL,
			lang: "Thai",
			auth: { kind: "device", webappUrl: WEBAPP_URL },
		});
		expect(prompt).toContain(`${WEBAPP_URL}/api/auth/device/code`);
		expect(prompt).toContain("client_id=excited-live-agent");
		expect(prompt).toContain(`${WEBAPP_URL}/api/auth/device/token`);
		expect(prompt).toMatchSnapshot();
	});
});
