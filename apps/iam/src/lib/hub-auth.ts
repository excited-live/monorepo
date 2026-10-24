import { API_AUTH_BASE_PATH, API_URL } from "./env"
import { getToken, setSession, type HubSession, type HubUser } from "./session"

/**
 * Hub sign-in against the single API's Better Auth **tokens** mount
 * (`/api/v1/auth`, packages/auth `mount: "tokens"`).
 *
 * The `bearer()` plugin returns the signed session token in the
 * `set-auth-token` response header whenever a response establishes a session,
 * and `apps/api` CORS exposes that header. We keep that token and send it as
 * `Authorization: Bearer` — no cookie is required by the API, which is what
 * makes a BFF-free SPA possible.
 */

interface BetterAuthErrorBody {
	message?: string
	code?: string
	error?: string
}

function authEndpoint(path: string): string {
	return `${API_URL}${API_AUTH_BASE_PATH}${path}`
}

async function readError(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as BetterAuthErrorBody
		return body.message || body.error || `${response.status} ${response.statusText}`
	} catch {
		return `${response.status} ${response.statusText || "request failed"}`
	}
}

/** Pull the user out of a sign-in/sign-up body, tolerating both shapes. */
function userFromBody(body: unknown, fallbackEmail: string): HubUser | null {
	const candidate = (body as { user?: Partial<HubUser> } | null)?.user
	if (candidate && typeof candidate.id === "string") {
		return {
			id: candidate.id,
			email: candidate.email ?? fallbackEmail,
			name: candidate.name ?? candidate.email ?? fallbackEmail,
		}
	}
	return null
}

async function establish(
	path: string,
	payload: Record<string, unknown>,
	fallbackEmail: string,
): Promise<HubSession> {
	const response = await fetch(authEndpoint(path), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
		credentials: "include",
	})

	if (!response.ok) throw new Error(await readError(response))

	const token = response.headers.get("set-auth-token")
	if (!token) {
		throw new Error(
			"This environment's API did not return a session token. The tokens mount needs BETTER_AUTH_SECRET set.",
		)
	}

	const body = await response.json().catch(() => null)
	// Confirm the token works before we store it — a token we cannot use is
	// worse than a clear error.
	const user = userFromBody(body, fallbackEmail) ?? (await fetchMe(token))
	const session: HubSession = { token, user }
	setSession(session)
	return session
}

async function fetchMe(token: string): Promise<HubUser> {
	const response = await fetch(`${API_URL}/api/v1/auth/me`, {
		headers: { authorization: `Bearer ${token}` },
		credentials: "include",
	})
	if (!response.ok) throw new Error("Signed in, but the session could not be verified.")
	const body = (await response.json()) as { user?: HubUser }
	if (!body.user) throw new Error("Signed in, but the session could not be verified.")
	return body.user
}

export async function signIn(email: string, password: string): Promise<HubSession> {
	return establish("/sign-in/email", { email, password }, email)
}

export async function signUp(name: string, email: string, password: string): Promise<HubSession> {
	return establish("/sign-up/email", { name, email, password }, email)
}

/** Full-page redirect to Google; Better Auth returns to `callbackURL` with the session. */
export async function startGoogleSignIn(callbackURL: string): Promise<void> {
	const response = await fetch(authEndpoint("/sign-in/social"), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ provider: "google", callbackURL }),
		credentials: "include",
	})
	if (!response.ok) throw new Error(await readError(response))
	const body = (await response.json()) as { url?: string }
	if (!body.url) throw new Error("Google sign-in is not configured in this environment.")
	window.location.assign(body.url)
}

/** Revalidate a stored token on boot; drop it when the API no longer accepts it. */
export async function refreshSession(token: string): Promise<HubSession | null> {
	try {
		const user = await fetchMe(token)
		const session: HubSession = { token, user }
		setSession(session)
		return session
	} catch {
		setSession(null)
		return null
	}
}

export async function signOut(): Promise<void> {
	const token = getToken()
	setSession(null)
	if (!token) return
	try {
		await fetch(authEndpoint("/sign-out"), {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
			credentials: "include",
		})
	} catch {
		// Local sign-out already happened; a failed server revoke is not fatal.
	}
}
