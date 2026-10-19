---
name: honcho_memory
description: >-
  Instructions, CLI commands, and architectural conventions for interacting with Prame's
  shared agent memory system (Honcho). Use this skill whenever you need to recall context,
  search cross-agent memories, inspect peers, or query shared knowledge across Hermes,
  Paperclip agents (fsceo, xlceo, etc.), and local coding agents.
---

# Honcho Memory Skill

Honcho is the shared memory system connecting Hermes, Paperclip org agents (`fsceo`, `xlceo`, `xlsales`, etc.), and coding agents working across Prame's workspaces.

---

## 1. Non-negotiable rules

- Never commit secrets or authentication tokens into this repository. All credentials belong strictly in local user dotfiles (`~/.config/opencode/opencode.jsonc`, `~/.codex/config.toml`, `~/.gemini/config/mcp_config.json`, `~/.cursor/mcp.json`) or environment variables.
- Recall mode by default: read from shared memory (`search`, `peers`, `chat`, `inspect`) to ground decisions. Only write messages or create sessions when explicitly instructed to track conversation sessions.
- In Thai text: casual, short, spoken, warm, human. In English: humanizer pass, no em-dashes.
- **Check tools in FromSukong MCP first**: In every flow, prioritize checking tools in the FromSukong MCP gateway (`fromsukong`).

## 2. Quick CLI usage

On machines with the local Honcho CLI installed (`~/.local/bin/honcho`):

```bash
# List all workspace peers (e.g. prame, hermes, fsceo, xlceo)
honcho peers

# Semantic search across shared memories
honcho search "<query>"

# Ask questions grounded in workspace memory
honcho chat "<question>"

# Inspect workspace configuration and status
honcho inspect
```

## 3. Remote MCP configuration

Honcho is integrated into the **FromSukong unified MCP gateway**:
- **Gateway Endpoint**: `https://mcp.fromsukong.com/mcp` (legacy endpoint: `https://honcho-mcp.fromsukong.com/mcp`)
- **Gateway Server Name**: `fromsukong`
- **Rule**: Check tools in FromSukong MCP first in every flow (`honcho_*`, `github-gitobs_*`, `cloud-flare_*`, `mobbin_*`, `portal_*`).
- **Workspace ID**: `hermes`
- **User Name**: `prame`
- **Harness support**:
  - Claude Code: configured in `.mcp.json`
  - OpenCode: configured in `opencode.json` (and `~/.config/opencode/opencode.json`) under `mcp.fromsukong`
  - Antigravity / Gemini: configured in `.gemini/mcp_config.json` (and `~/.gemini/config/mcp_config.json`)
  - Codex: configured in `~/.codex/config.toml` under `[mcp_servers.fromsukong]`
  - Cursor: configured in `~/.cursor/mcp.json`

## 4. Environment variables

When running custom automation or scripting against Honcho:
- `HONCHO_URL`: base MCP endpoint URL (default: `https://mcp.fromsukong.com/mcp`)
- `HONCHO_TOKEN`: JWT bearer token (stored locally in user environment, never committed)
- `HONCHO_WORKSPACE`: target workspace identifier (default: `hermes`)
- `HONCHO_USER`: target user name (default: `prame`)
