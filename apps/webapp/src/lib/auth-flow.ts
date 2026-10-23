/**
 * Pure helpers for the Better Auth web pages (sign-in / create-account).
 *
 * The OAuth (MCP) and device flows both bounce signed-out users to /sign-in
 * with the flow state in the query string. Sign-in and sign-up must resume
 * identically, so the destination logic lives here instead of in the route
 * component — one implementation, tested for both modes.
 */

/** The two modes of the /sign-in page. */
export type AuthMode = "signin" | "signup"

/** Better Auth's default minimum password length (emailAndPassword default). */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Query parameters that belong to the local page rather than to a flow we are
 * resuming. They must never be forwarded to the OAuth authorize endpoint.
 */
const UI_ONLY_PARAMS = ["returnPathname", "mode"] as const

export function parseAuthMode(value: unknown): AuthMode {
	return value === "signup" ? "signup" : "signin"
}

/**
 * Only same-origin, absolute paths are safe redirect targets.
 *
 * `//host` is protocol-relative; `/\host` is normalised by browsers to `//host`
 * for special schemes, so both are rejected.
 */
export function sanitizeReturnPath(value: string | undefined): string {
	if (!value || !value.startsWith("/")) return "/"
	if (value.startsWith("//") || value.startsWith("/\\")) return "/"
	return value
}

/**
 * When the OAuth provider (or the device page) bounced the user here, the URL
 * carries a signed authorization query (`client_id` + `sig`). After sign-in or
 * sign-up we must resume that flow instead of landing on the dashboard:
 * forward the raw query back to the authorize endpoint. The raw string is used
 * on purpose — the signature covers repeated `ba_param` entries, which a
 * parsed object would lose.
 */
export function oauthResumeUrl(search: string): string | null {
	const params = new URLSearchParams(search)
	for (const name of UI_ONLY_PARAMS) params.delete(name)
	if (!params.has("client_id") || !params.has("sig")) return null
	return `/api/auth/oauth2/authorize?${params.toString()}`
}

/**
 * Where a just-authenticated user goes: resume the OAuth authorization request
 * when this page was part of one, otherwise the sanitized return path (device
 * approval, consent, or the dashboard).
 */
export function postAuthDestination(search: string, returnPathname: string | undefined): string {
	return oauthResumeUrl(search) ?? sanitizeReturnPath(returnPathname)
}

/**
 * The subset of Better Auth's client error we inspect. Better Auth spreads the
 * endpoint body onto the error, so `code`/`message` are top-level; status is
 * always present.
 */
export interface AuthClientError {
	status?: number
	code?: string
	message?: string
	error?: { code?: string; message?: string } | string | null
}

function errorCode(error: AuthClientError): string | undefined {
	if (typeof error.code === "string") return error.code
	const body = error.error
	if (body && typeof body === "object" && typeof body.code === "string") return body.code
	return undefined
}

function errorText(error: AuthClientError): string {
	const body = error.error
	const fromBody = body && typeof body === "object" ? body.message : body
	return `${error.message ?? ""} ${typeof fromBody === "string" ? fromBody : ""}`.toLowerCase()
}

export type SignUpErrorKind = "duplicate" | "invalidEmail" | "weakPassword" | "generic"

/**
 * Map a Better Auth sign-up error onto a user-facing message kind.
 *
 * Endpoint codes come from better-auth's sign-up route:
 * `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (422), `INVALID_EMAIL` (400) and
 * `PASSWORD_TOO_SHORT` (400). Status/message fallbacks keep the page sane if a
 * code is added or renamed.
 */
export function signUpErrorKind(error: AuthClientError | null | undefined): SignUpErrorKind {
	if (!error) return "generic"
	const code = errorCode(error)
	const message = errorText(error)
	if (
		code === "USER_ALREADY_EXISTS" ||
		code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
		error.status === 422 ||
		message.includes("already exists")
	) {
		return "duplicate"
	}
	if (code === "INVALID_EMAIL" || message.includes("invalid email")) return "invalidEmail"
	if (code === "PASSWORD_TOO_SHORT" || message.includes("password too short")) return "weakPassword"
	return "generic"
}
