import { useMemo } from "react"
import type { Endpoint } from "../../generated/endpoints"

/**
 * Builds the request form from the generated OpenAPI schema.
 *
 * Values are strings in the DOM; `toRequest` coerces them back to numbers,
 * booleans and empty-object/array JSON at submit time. No validation library is
 * pulled in — the API is the validator, and its typed error is shown verbatim.
 */
export interface RequestDraft {
	path: Record<string, string>
	body: Record<string, string>
}

export function draftFor(endpoint: Endpoint): RequestDraft {
	const path: Record<string, string> = {}
	for (const param of endpoint.params) {
		if (param.in === "path") path[param.name] = param.name.toLowerCase().includes("month") ? currentMonth() : ""
	}
	const body: Record<string, string> = {}
	for (const field of endpoint.body?.fields ?? []) {
		const seed = endpoint.body?.draft?.[field.name]
		body[field.name] = seed === undefined ? "" : stringify(seed)
	}
	return { path, body }
}

function currentMonth(): string {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function stringify(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (typeof value === "string") return value
	return JSON.stringify(value)
}

/** Filled-in path with `{param}` placeholders replaced. */
export function resolvePath(endpoint: Endpoint, path: Record<string, string>): string {
	return endpoint.path.replace(/\{([^}]+)\}/g, (match, name: string) => {
		const value = path[name]?.trim()
		return value ? encodeURIComponent(value) : match
	})
}

function coerce(raw: string): unknown {
	const trimmed = raw.trim()
	if (trimmed === "") return undefined
	if (trimmed === "true") return true
	if (trimmed === "false") return false
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			return JSON.parse(trimmed)
		} catch {
			return trimmed
		}
	}
	return raw
}

/** Only non-empty fields go on the wire, so optional fields stay absent. */
export function toBody(body: Record<string, string>): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	for (const [name, raw] of Object.entries(body)) {
		const value = coerce(raw)
		if (value !== undefined) out[name] = value
	}
	return out
}

export function RequestBuilder({ endpoint, draft, onChange, onRun, busy, canRun }: {
	endpoint: Endpoint
	draft: RequestDraft
	onChange: (next: RequestDraft) => void
	onRun: () => void
	busy: boolean
	canRun: boolean
}) {
	const pathParams = endpoint.params.filter((param) => param.in === "path")
	const fields = endpoint.body?.fields ?? []
	const missingPath = useMemo(
		() => pathParams.some((param) => param.required && !draft.path[param.name]?.trim()),
		[pathParams, draft.path],
	)

	const setPath = (name: string, value: string) =>
		onChange({ ...draft, path: { ...draft.path, [name]: value } })
	const setBody = (name: string, value: string) =>
		onChange({ ...draft, body: { ...draft.body, [name]: value } })

	return (
		<div className="stack" style={{ gap: 14 }}>
			{pathParams.length > 0 ? (
				<div className="field-grid">
					{pathParams.map((param) => (
						<div className="field" key={param.name}>
							<label htmlFor={`path-${param.name}`}>
								{param.name} <em>{param.required ? "required" : "optional"}</em>
							</label>
							<input
								id={`path-${param.name}`}
								value={draft.path[param.name] ?? ""}
								onChange={(event) => setPath(param.name, event.target.value)}
								placeholder={param.type}
								spellCheck={false}
							/>
							{param.description ? <small>{param.description}</small> : null}
						</div>
					))}
				</div>
			) : null}

			{fields.length > 0 ? (
				<div className="field-grid">
					{fields.map((field) => (
						<div className="field" key={field.name}>
							<label htmlFor={`body-${field.name}`}>
								{field.name} {field.required ? <em>required</em> : null}
							</label>
							{field.enum ? (
								<select
									id={`body-${field.name}`}
									value={draft.body[field.name] ?? ""}
									onChange={(event) => setBody(field.name, event.target.value)}
								>
									<option value="">—</option>
									{field.enum.map((value) => (
										<option key={value} value={value}>{value}</option>
									))}
								</select>
							) : field.type.startsWith("object") || field.type.startsWith("array") || field.type === "array<object>" ? (
								<textarea
									id={`body-${field.name}`}
									value={draft.body[field.name] ?? ""}
									onChange={(event) => setBody(field.name, event.target.value)}
									placeholder={field.type}
									spellCheck={false}
								/>
							) : (
								<input
									id={`body-${field.name}`}
									value={draft.body[field.name] ?? ""}
									onChange={(event) => setBody(field.name, event.target.value)}
									placeholder={field.type}
									spellCheck={false}
									inputMode={field.type === "number" || field.type === "integer" ? "decimal" : undefined}
								/>
							)}
							{field.description ? <small>{field.description}</small> : null}
						</div>
					))}
				</div>
			) : (
				<div className="no-body">
					{endpoint.body ? "This endpoint has no documented body fields." : "No request body — path and query only."}
				</div>
			)}

			<div className="row spread">
				<span className="tiny muted">
					The form is built from the committed OpenAPI schema; the API validates it.
				</span>
				<button type="button" className="btn signal" onClick={onRun} disabled={busy || missingPath || !canRun}>
					{busy ? "Running…" : "Run action"}
				</button>
			</div>
			{missingPath ? <p className="tiny muted">Fill the path parameters first.</p> : null}
			{!canRun ? <p className="tiny muted">Sign in to send a request with your own token.</p> : null}
		</div>
	)
}
