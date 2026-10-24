import { API_URL } from "./env"
import { getToken } from "./session"

/**
 * The one HTTP client.
 *
 * Every call in this app goes to `${API_URL}` — there is no `/api` proxy and no
 * server function, so a request built here is exactly the request a user sees
 * in the inspector deck and can copy as cURL.
 */

export class ApiError extends Error {
	readonly status: number
	readonly code: string | undefined

	constructor(message: string, status: number, code?: string) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.code = code
	}
}

export interface ApiRequestOptions {
	method?: string
	body?: unknown
	/** Send the stored bearer token (default true). */
	auth?: boolean
	/** Extra headers, e.g. an explicit token when replaying a request. */
	headers?: Record<string, string>
	/** Token override — used by the Data tab when it previews a request. */
	token?: string | null
	signal?: AbortSignal
}

/** Absolute URL for an API path (the Data tab and cURL export share it). */
export function apiUrl(path: string): string {
	if (/^https?:\/\//i.test(path)) return path
	return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function apiFetch<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
	const { method = "GET", body, auth = true, headers = {}, token, signal } = options
	const requestHeaders: Record<string, string> = { accept: "application/json", ...headers }
	if (body !== undefined) requestHeaders["content-type"] = "application/json"
	if (auth) {
		const value = token === undefined ? getToken() : token
		if (value) requestHeaders.authorization = `Bearer ${value}`
	}

	let response: Response
	try {
		response = await fetch(apiUrl(path), {
			method,
			headers: requestHeaders,
			body: body === undefined ? undefined : JSON.stringify(body),
			credentials: "include",
			signal,
		})
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") throw error
		throw new ApiError(
			`Cannot reach ${API_URL}. Is the API running and is VITE_API_URL correct?`,
			0,
			"network_error",
		)
	}

	const text = await response.text()
	const parsed = text ? safeJson(text) : null

	if (!response.ok) {
		const payload = parsed as { error?: string; code?: string } | null
		throw new ApiError(
			payload?.error ?? `${response.status} ${response.statusText || "request failed"}`,
			response.status,
			payload?.code,
		)
	}

	return parsed as T
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text)
	} catch {
		return text
	}
}
