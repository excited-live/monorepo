import { createAuthClient } from "@excited-live/auth/client"
import { AS_AUTH_BASE_PATH, AUTH_SERVER_URL } from "./env"

/**
 * The OAuth authorization-server client (cookie mount).
 *
 * Consent and device approval are *browser approval* steps: the user proves who
 * they are to the authorization server that will issue the agent's token. That
 * server is the webapp's Better Auth cookies mount, so these calls go to
 * `AUTH_SERVER_URL` with `credentials: "include"` — cross-origin, and allowed
 * by the CORS headers added to its `/api/auth` route (apps/webapp
 * `lib/auth-cors.ts`).
 *
 * The hub session (bearer token) is separate on purpose: `lib/hub-auth.ts` is
 * for the app's own API calls, this module is for the two approval pages.
 */
const authClient = createAuthClient({
	baseURL: AUTH_SERVER_URL,
	basePath: AS_AUTH_BASE_PATH,
	fetchOptions: { credentials: "include" },
})

export interface AsUser {
	id: string
	email: string
	name: string
}

export async function asSession(): Promise<AsUser | null> {
	const { data } = await authClient.getSession()
	const user = data?.user
	if (!user?.id) return null
	return { id: user.id, email: user.email, name: user.name }
}

export async function asSignIn(email: string, password: string): Promise<string | null> {
	const { error } = await authClient.signIn.email({ email, password })
	return error ? (error.message ?? "Sign-in failed") : null
}

export async function asSignUp(name: string, email: string, password: string): Promise<string | null> {
	const { error } = await authClient.signUp.email({ name, email, password })
	return error ? (error.message ?? "Could not create the account") : null
}

export async function asSignInWithGoogle(callbackURL: string): Promise<void> {
	await authClient.signIn.social({ provider: "google", callbackURL })
}

export async function asSignOut(): Promise<void> {
	await authClient.signOut()
}

/** Absolute URL on the authorization server, for full-page navigations. */
export function asUrl(path: string): string {
	return `${AUTH_SERVER_URL}${path.startsWith("/") ? path : `/${path}`}`
}

async function asJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(asUrl(path), {
		...init,
		credentials: "include",
		headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
	})
	const body = (await response.json().catch(() => null)) as T & { message?: string; error?: string }
	if (!response.ok) {
		throw new Error(body?.message || body?.error || `${response.status} ${response.statusText}`)
	}
	return body
}

/** Public client fields for the consent screen (name shown to the user). */
export async function fetchPublicClient(clientId: string): Promise<string | null> {
	try {
		const body = await asJson<{ client_id?: string; client_name?: string }>(
			`${AS_AUTH_BASE_PATH}/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
		)
		return body.client_name || body.client_id || null
	} catch {
		return null
	}
}

/** Allow or deny an OAuth authorization request; returns where to send the browser. */
export async function decideConsent(accept: boolean, oauthQuery: string): Promise<string> {
	const body = await asJson<{ url?: string }>(`${AS_AUTH_BASE_PATH}/oauth2/consent`, {
		method: "POST",
		body: JSON.stringify({ accept, oauth_query: oauthQuery.replace(/^\?/, "") }),
	})
	if (!body.url) throw new Error("The authorization server did not return a redirect.")
	return body.url
}

export interface DeviceRequest {
	userCode: string
	status: string
	clientId: string | null
	scope: string | null
}

/** Claim and read a device code for the signed-in user (RFC 8628). */
export async function fetchDeviceRequest(userCode: string): Promise<DeviceRequest> {
	const body = await asJson<{ user_code?: string; status?: string; client_id?: string; scope?: string }>(
		`${AS_AUTH_BASE_PATH}/device?user_code=${encodeURIComponent(userCode)}`,
	)
	return {
		userCode: body.user_code ?? userCode,
		status: body.status ?? "pending",
		clientId: body.client_id ?? null,
		scope: body.scope ?? null,
	}
}

export async function decideDevice(accept: boolean, userCode: string): Promise<void> {
	await asJson(`${AS_AUTH_BASE_PATH}/device/${accept ? "approve" : "deny"}`, {
		method: "POST",
		body: JSON.stringify({ userCode }),
	})
}
