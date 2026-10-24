import { API_URL } from "./env"
import { apiFetch } from "./api"
import { useCallback, useEffect, useState } from "react"

/** Agent API key as the API lists it (secret is never returned after mint). */
export interface AgentKey {
	id: string
	name: string | null
	start: string | null
	agentId: string | null
	createdAt: string
	expiresAt: string | null
	lastRequest: string | null
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

/**
 * MCP gateway reachability — a plain GET /health on the single API.
 *
 * This is the only "telemetry" the app claims: it proves the origin the page
 * talks to is alive. It is not a claim about any individual agent.
 */
export function useGatewayHealth(): boolean | null {
	const [up, setUp] = useState<boolean | null>(null)

	useEffect(() => {
		let cancelled = false
		const check = async () => {
			try {
				const response = await fetch(`${API_URL}/health`, { headers: { accept: "application/json" } })
				if (!cancelled) setUp(response.ok)
			} catch {
				if (!cancelled) setUp(false)
			}
		}
		void check()
		const timer = setInterval(check, 30_000)
		return () => {
			cancelled = true
			clearInterval(timer)
		}
	}, [])

	return up
}
