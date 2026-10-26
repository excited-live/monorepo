import { API_URL, MCP_URL } from "./env"
import { apiFetch } from "./api"
import { getToken } from "./session"
import { useCallback, useEffect, useState, useSyncExternalStore } from "react"

/** Agent API key as the API lists it (secret is never returned after mint). */
export interface AgentKey {
	id: string
	name: string | null
	start: string | null
	agentId: string | null
	createdAt: string
	expiresAt: string | null
	lastRequest: string | null
	/** Request budget reported by the API's own counters (#156). */
	rateLimit: { limit: number; remaining: number; reset: number | null } | null
}

export interface MintedAgentKey {
	id: string
	key: string
	name: string | null
	start: string | null
	expiresAt: string | null
}

export async function listAgentKeys(): Promise<AgentKey[]> {
	const body = await apiFetch<{ keys: AgentKey[] }>("/api/v1/agent-keys")
	return body.keys
}

export async function mintAgentKey(agentId: string, name?: string): Promise<MintedAgentKey> {
	return apiFetch<MintedAgentKey>("/api/v1/agent-keys", {
		method: "POST",
		body: { agentId, ...(name ? { name } : {}) },
	})
}

export async function revokeAgentKey(id: string): Promise<void> {
	await apiFetch(`/api/v1/agent-keys/${encodeURIComponent(id)}`, { method: "DELETE" })
}

/** The newest minted key, kept so the config card can show the full secret once. */
const MINTED_KEY = "excited_iam_last_key"

export function rememberMintedKey(key: MintedAgentKey): void {
	try {
		window.localStorage.setItem(MINTED_KEY, JSON.stringify(key))
	} catch {
		// Non-fatal: the card falls back to "mint a key".
	}
}

export function recallMintedKey(): MintedAgentKey | null {
	try {
		const raw = window.localStorage.getItem(MINTED_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as MintedAgentKey
		return typeof parsed.key === "string" ? parsed : null
	} catch {
		return null
	}
}

export function forgetMintedKey(): void {
	try {
		window.localStorage.removeItem(MINTED_KEY)
	} catch {
		// ignore
	}
}

/** Live keys for the signed-in user; `enabled=false` skips the request. */
export function useAgentKeys(enabled: boolean) {
	const [keys, setKeys] = useState<AgentKey[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		if (!enabled) {
			setKeys([])
			return
		}
		setLoading(true)
		setError(null)
		try {
			setKeys(await listAgentKeys())
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load keys")
		} finally {
			setLoading(false)
		}
	}, [enabled])

	useEffect(() => {
		void reload()
	}, [reload])

	return { keys, loading, error, reload }
}

export type ApiState = "ok" | "degraded" | "down" | "unknown"

export interface ApiHealth {
	state: ApiState
	/** Last measured round trip in ms; null until the first answer. */
	latencyMs: number | null
}

/**
 * MCP gateway reachability — a plain GET /health on the single API.
 *
 * This is the only "telemetry" the app claims: it proves the origin the page
 * talks to is alive. "Degraded" means it answered but slowly; it is a UI hint,
 * not a status-page claim. A slow origin still gets a red-ish dot, never a
 * spinner, so the band can render immediately with "API ?" and settle.
 */
const UNKNOWN_HEALTH: ApiHealth = { state: "unknown", latencyMs: null }
let sharedHealth: ApiHealth = UNKNOWN_HEALTH
const healthListeners = new Set<() => void>()
let healthTimer: ReturnType<typeof setInterval> | null = null
let healthInFlight = false

function publishHealth(next: ApiHealth): void {
	sharedHealth = next
	for (const listener of healthListeners) listener()
}

async function checkHealth(): Promise<void> {
	if (healthInFlight) return
	healthInFlight = true
	const started = performance.now()
	try {
		const response = await fetch(`${API_URL}/health`, { headers: { accept: "application/json" } })
		const latencyMs = Math.round(performance.now() - started)
		if (!response.ok) publishHealth({ state: "down", latencyMs })
		else publishHealth({ state: latencyMs >= 1_500 ? "degraded" : "ok", latencyMs })
	} catch {
		publishHealth({ state: "down", latencyMs: null })
	} finally {
		healthInFlight = false
	}
}

function subscribeHealth(listener: () => void): () => void {
	healthListeners.add(listener)
	if (!healthTimer) {
		void checkHealth()
		healthTimer = setInterval(() => void checkHealth(), 30_000)
	}
	return () => {
		healthListeners.delete(listener)
		if (healthListeners.size === 0 && healthTimer) {
			clearInterval(healthTimer)
			healthTimer = null
		}
	}
}

/**
 * One poller for the whole app: the topbar pill and the status band read the
 * same sample instead of racing two /health requests on signed-in Home (#92).
 */
export function useApiHealth(): ApiHealth {
	return useSyncExternalStore(subscribeHealth, () => sharedHealth, () => UNKNOWN_HEALTH)
}

/** Boolean wrapper kept for the topbar pill. */
export function useGatewayHealth(): boolean | null {
	const { state } = useApiHealth()
	if (state === "unknown") return null
	return state !== "down"
}

export interface OnboardingState {
	userId: string
	appId: string
	isCompleted: boolean
	completedAt: string | null
	done: string[]
	skipped: string[]
	method: "agent" | "manual" | null
	updatedAt: string
}

/**
 * Onboarding progress for the status band (#92).
 *
 * Same `GET /api/v1/onboarding` an agent reads through `get_onboarding_status`.
 * It is read-only here: the band shows the count and the next step, never a
 * write. A failed read leaves the tile in its own error state.
 */
export function useOnboarding(enabled: boolean) {
	const [state, setState] = useState<OnboardingState | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		if (!enabled) {
			setState(null)
			return
		}
		setLoading(true)
		setError(null)
		try {
			setState(await apiFetch<OnboardingState>("/api/v1/onboarding"))
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load onboarding")
		} finally {
			setLoading(false)
		}
	}, [enabled])

	useEffect(() => {
		void reload()
	}, [reload])

	return { state, loading, error, reload }
}

export interface McpTool {
	name: string
	title?: string
	description?: string
}

/**
 * The live MCP tool registry (#90).
 *
 * The page must not name tools from a fixture: the list an agent receives is
 * the list the page shows. A signed-in hub session token is accepted by /mcp
 * (mcp.auth.ts falls through to the Better Auth session), so one JSON-RPC
 * `tools/list` is enough. The response is either JSON or one SSE `data:` frame
 * depending on the transport, so both are parsed.
 */
export function useMcpTools(enabled: boolean) {
	const [tools, setTools] = useState<McpTool[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		if (!enabled) {
			setTools([])
			return
		}
		setLoading(true)
		setError(null)
		try {
			const response = await fetch(MCP_URL, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					authorization: `Bearer ${getToken() ?? ""}`,
				},
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
			})
			if (!response.ok) throw new Error(`${response.status} ${response.statusText || "request failed"}`)
			const payload = await readJsonRpc(response)
			const list = (payload as { result?: { tools?: McpTool[] } } | null)?.result?.tools
			if (!Array.isArray(list)) throw new Error("The server did not return a tool list")
			setTools(list)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not read the tool registry")
		} finally {
			setLoading(false)
		}
	}, [enabled])

	useEffect(() => {
		void reload()
	}, [reload])

	return { tools, loading, error, reload }
}

/** One JSON-RPC response, whether the server answered with JSON or SSE. */
async function readJsonRpc(response: Response): Promise<unknown> {
	return parseJsonRpcText(await response.text(), response.headers.get("content-type") ?? "")
}

/**
 * Parse a streamable-HTTP MCP reply.
 *
 * The transport may answer with a single JSON document or with SSE frames
 * (`event: message` / `data: {...}`), and a proxy may strip the content type.
 * Pure and exported so both shapes are unit-tested without a network.
 */
export function parseJsonRpcText(text: string, contentType = ""): unknown {
	if (!text.trim()) return null
	if (!contentType.includes("text/event-stream")) {
		try {
			return JSON.parse(text)
		} catch {
			// Some proxies omit the content type; fall through to the SSE parser.
		}
	}
	for (const line of text.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed.startsWith("data:")) continue
		const data = trimmed.slice(5).trim()
		if (!data || data === "[DONE]") continue
		try {
			return JSON.parse(data)
		} catch {
			// Keep scanning: SSE frames can include keep-alive comments.
		}
	}
	throw new Error("The MCP server sent no JSON-RPC result")
}
