import { useMemo, useState } from "react"
import { ENDPOINTS, ENDPOINT_TAGS, type Endpoint } from "../../generated/endpoints"

/** Grouped, searchable action tree for the Data tab's left rail. */
export function EndpointRail({ selectedId, onSelect }: {
	selectedId: string
	onSelect: (endpoint: Endpoint) => void
}) {
	const [query, setQuery] = useState("")

	const groups = useMemo(() => {
		const needle = query.trim().toLowerCase()
		const matches = needle
			? ENDPOINTS.filter((endpoint) =>
					`${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.tag}`.toLowerCase().includes(needle),
				)
			: ENDPOINTS
		return ENDPOINT_TAGS.map((tag) => ({
			tag,
			endpoints: matches.filter((endpoint) => endpoint.tag === tag),
		})).filter((group) => group.endpoints.length > 0)
	}, [query])

	return (
		<aside className="rail" data-panel aria-label="API endpoints">
			<div className="rail-head">
				<div className="search">
					<span aria-hidden="true" className="tiny muted">⌕</span>
					<label htmlFor="endpoint-search" className="sr-only">Search endpoints</label>
					<input
						id="endpoint-search"
						type="search"
						placeholder="Search paths and actions"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				<span className="tiny muted">
					{ENDPOINTS.length} endpoints · generated from openapi.json
				</span>
			</div>
			<div className="rail-list">
				{groups.map((group) => (
					<div className="rail-group" key={group.tag}>
						<p>{group.tag}</p>
						{group.endpoints.map((endpoint) => (
							<button
								key={endpoint.id}
								type="button"
								className="rail-item"
								aria-current={endpoint.id === selectedId}
								onClick={() => onSelect(endpoint)}
							>
								<span className={`badge ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
								<code title={endpoint.path}>{endpoint.path.replace("/api/v1", "")}</code>
							</button>
						))}
					</div>
				))}
				{groups.length === 0 ? <p className="tiny muted" style={{ padding: 10 }}>No endpoint matches “{query}”.</p> : null}
			</div>
		</aside>
	)
}
