import { useSyncExternalStore } from "react"

/**
 * Hub session = an API bearer token plus the user it belongs to.
 *
 * Why not a cookie: `apps/api` resolves identity for `/api/v1/*` **only** from
 * `Authorization: Bearer` when auth is configured (see createIdentityMiddleware),
 * so a no-BFF browser client must hold the token itself. The webapp keeps its
 * cookie session for its own pages; iam and the agents it wires up share this
 * one token model.
 *
 * Storage: `localStorage`, because the token is the thing the MCP config card
 * shows and the user expects to survive a reload. It never leaves the browser
 * except as the `Authorization` header to the API origin. Follow-up (documented
 * in docs/iam.md): move to an httpOnly cookie once the API accepts cookie
 * sessions, which removes the XSS surface.
 */

export interface HubUser {
	id: string
	email: string
	name: string
}

export interface HubSession {
	token: string
	user: HubUser
}

const STORAGE_KEY = "excited_iam_session_v1"

type Listener = () => void

const listeners = new Set<Listener>()
let snapshot: HubSession | null | undefined

function readStorage(): HubSession | null {
	if (typeof window === "undefined") return null
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as Partial<HubSession>
		if (typeof parsed.token !== "string" || !parsed.token) return null
		if (!parsed.user || typeof parsed.user.id !== "string") return null
		return { token: parsed.token, user: parsed.user }
	} catch {
		return null
	}
}

/** Current session, cached so `useSyncExternalStore` gets a stable object. */
export function getSession(): HubSession | null {
	if (snapshot === undefined) snapshot = readStorage()
	return snapshot
}

export function setSession(next: HubSession | null): void {
	snapshot = next
	if (typeof window !== "undefined") {
		try {
			if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
			else window.localStorage.removeItem(STORAGE_KEY)
		} catch {
			// Private mode / quota: keep the in-memory session for this tab.
		}
	}
	for (const listener of listeners) listener()
}

export function subscribeSession(listener: Listener): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

/** Reactive session for components. */
export function useSession(): HubSession | null {
	return useSyncExternalStore(subscribeSession, getSession, () => null)
}

/** The token to send with an API call, if any. */
export function getToken(): string | null {
	return getSession()?.token ?? null
}
