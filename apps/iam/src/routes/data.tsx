import { useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { EndpointRail } from "../components/data/EndpointRail"
import { InspectorDeck } from "../components/data/InspectorDeck"
import { RequestBuilder, draftFor, resolvePath, toBody, type RequestDraft } from "../components/data/RequestBuilder"
import { CodeDeck } from "../components/CodeDeck"
import { ENDPOINTS, API_VERSION, type Endpoint } from "../generated/endpoints"
import { apiFetch, ApiError } from "../lib/api"
import { formatMonth } from "../lib/format"
import { SAMPLES } from "../lib/samples"
import { useSession } from "../lib/session"
import { endpointView } from "../lib/views"

type Result =
	| { kind: "live"; data: unknown; status: number; ms: number; path: string }
	| { kind: "sample"; data: unknown; path: string }
	| { kind: "error"; message: string; status: number | null; path: string }

/**
 * Data — interactive docs over the real single API.
 *
 * Left: the generated endpoint catalog (from apps/api/openapi.json, so it
 * cannot drift). Center: a request form built from the schema, the live answer
 * rendered as a design-system component, raw JSON on demand. Right: the same
 * call as cURL, as a package function, and as an MCP tool call.
 */
export function DataPage() {
	const search = useSearch({ strict: false }) as { endpoint?: string }
	const navigate = useNavigate()
	const session = useSession()

	const [selectedId, setSelectedId] = useState(() => {
		const requested = search.endpoint
		return ENDPOINTS.some((entry) => entry.id === requested) ? requested : "get-api-v1-accounting-summary"
	})
	const endpoint = useMemo(
		() => ENDPOINTS.find((entry) => entry.id === selectedId) ?? ENDPOINTS[0]!,
		[selectedId],
	)

	const [draft, setDraft] = useState<RequestDraft>(() => draftFor(endpoint))
	const [result, setResult] = useState<Result | null>(null)
	const [tab, setTab] = useState<"component" | "json">("component")
	const [busy, setBusy] = useState(false)

	// A deep link (Overview card → /data?endpoint=…) selects that endpoint.
	useEffect(() => {
		if (search.endpoint && search.endpoint !== selectedId && ENDPOINTS.some((entry) => entry.id === search.endpoint)) {
			setSelectedId(search.endpoint)
		}
	}, [search.endpoint, selectedId])

	const select = useCallback(
		(next: Endpoint) => {
			setSelectedId(next.id)
			setDraft(draftFor(next))
			setResult(null)
			setTab("component")
			void navigate({ to: "/data", search: { endpoint: next.id }, replace: true })
		},
		[navigate],
	)

	const path = resolvePath(endpoint, draft.path)
	const body = endpoint.body ? toBody(draft.body) : undefined
	const call = { method: endpoint.method, path, body, token: session?.token ?? null }
	const sample = SAMPLES[endpoint.id]
	const canRun = Boolean(session)

	const run = useCallback(async () => {
		if (endpoint.method !== "GET" && endpoint.method !== "DELETE" && body === undefined) return
		setBusy(true)
		const started = performance.now()
		try {
			const data = await apiFetch(path, { method: endpoint.method, body })
			setResult({ kind: "live", data, status: 200, ms: Math.round(performance.now() - started), path })
			setTab("component")
		} catch (error) {
			const status = error instanceof ApiError ? error.status : null
			setResult({
				kind: "error",
				message: error instanceof Error ? error.message : "Request failed",
				status,
				path,
			})
		} finally {
			setBusy(false)
		}
	}, [body, endpoint.method, path])

	const preview = useCallback(() => {
		setResult({ kind: "sample", data: sample, path })
		setTab("component")
	}, [path, sample])

	const view = result && result.kind !== "error" ? endpointView(endpoint.id, result.data) : null
	const showView = tab === "component" && view

	return (
		<div className="page" style={{ gap: 20 }}>
			<div className="page-head">
				<div>
					<span className="eyebrow">Data · interactive API</span>
					<h1 style={{ fontSize: "clamp(26px, 3.6vw, 38px)" }}>Every call, and what it returns.</h1>
					<p className="lede">
						The catalog is generated from the API's OpenAPI document, version {API_VERSION}. Run a
						request against the single API and see the component an agent would get back — plus
						the exact cURL, package function and MCP tool call behind it.
					</p>
				</div>
				{!session ? (
					<div className="row">
						<button type="button" className="btn secondary" onClick={preview} disabled={!sample}>
							Preview sample data
						</button>
					</div>
				) : null}
			</div>

			<div className="data-layout">
				<EndpointRail selectedId={endpoint.id} onSelect={select} />

				<section className="stage" data-panel aria-label={`${endpoint.method} ${endpoint.path}`}>
					<header className="stage-head">
						<div className="row" style={{ gap: 8 }}>
							<span className={`badge ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
							<span className="badge">{endpoint.tag}</span>
						</div>
						<h2 style={{ fontSize: 20 }}>{endpoint.summary}</h2>
						<span className="mono muted">{path}</span>
						{endpoint.description ? <p className="small muted" style={{ margin: 0 }}>{endpoint.description}</p> : null}
					</header>

					<div className="stage-body">
						<RequestBuilder
							endpoint={endpoint}
							draft={draft}
							onChange={setDraft}
							onRun={run}
							busy={busy}
							canRun={canRun}
						/>

						<div className="output">
							<div className="row spread">
								<div className="segmented" role="tablist" aria-label="Result view">
									<button type="button" role="tab" aria-selected={tab === "component"} onClick={() => setTab("component")}>
										Rendered component
									</button>
									<button type="button" role="tab" aria-selected={tab === "json"} onClick={() => setTab("json")}>
										Raw JSON
									</button>
								</div>
								{result?.kind === "live" ? (
									<span className="badge ok">{result.ms} ms · live</span>
								) : result?.kind === "sample" ? (
									<span className="badge warn">sample data</span>
								) : result?.kind === "error" ? (
									<span className="badge delete">{result.status ?? "network"}</span>
								) : null}
							</div>

							{result === null ? (
								<div className="empty">
									<p style={{ margin: 0 }}>
										{canRun
											? "Fill the fields and run the action to see the response."
											: "Sign in to run against your own data, or preview a sample response."}
									</p>
									{sample ? (
										<button type="button" className="btn small secondary" onClick={preview}>
											Preview sample
										</button>
									) : null}
								</div>
							) : result.kind === "error" ? (
								<div className="stack" style={{ gap: 10 }}>
									<div className="error-box">
										<strong>{result.status === 401 ? "Not authorised" : "Request failed"}</strong>
										<div>{result.message}</div>
									</div>
									{result.status === 401 ? (
										<p className="small muted" style={{ margin: 0 }}>
											Your session token was rejected — sign in again, or check that the API has
											BETTER_AUTH_SECRET set in this environment.
										</p>
									) : null}
									<CodeDeck code={JSON.stringify({ method: endpoint.method, path: result.path, error: result.message }, null, 2)} label="request" />
								</div>
							) : showView ? (
								<div className="stack" style={{ gap: 8 }}>
									{view}
									{result.kind === "sample" ? (
										<p className="tiny muted" style={{ margin: 0 }}>
											Sample response for illustration. Sign in to run the same call against your ledger.
										</p>
									) : null}
								</div>
							) : (
								<div className="stack" style={{ gap: 8 }}>
									<CodeDeck code={JSON.stringify(result.data, null, 2)} label={`${endpoint.method} ${result.path}`} wrap />
									<p className="tiny muted" style={{ margin: 0 }}>
										No custom view for this endpoint yet — the raw response is the source of truth.
										{result.kind === "sample" ? " (sample data)" : ""}
									</p>
								</div>
							)}
						</div>
					</div>
				</section>

				<InspectorDeck endpoint={endpoint} call={call} />
			</div>

			<p className="tiny muted" style={{ margin: 0 }}>
				{formatMonth(new Date().toISOString().slice(0, 7))} · catalog generated from the committed
				OpenAPI document, so a new route appears here as soon as the API ships it.
			</p>
		</div>
	)
}
