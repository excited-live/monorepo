import { Link } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CodeDeck } from "../components/CodeDeck"
import { API_URL, ENV_LABEL, MCP_URL } from "../lib/env"
import { formatRelative } from "../lib/format"
import { MCP_CLIENTS, mcpConfig, type McpClientId } from "../lib/snippets"
import {
	forgetMintedKey,
	mintAgentKey,
	recallMintedKey,
	rememberMintedKey,
	useAgentKeys,
	type MintedAgentKey,
} from "../lib/queries"
import { useSession } from "../lib/session"

/**
 * Overview — the agent command center.
 *
 * Two honest sources of truth:
 *  - the MCP config card renders a real endpoint and a real key (minted by
 *    `POST /api/v1/agent-keys`, scoped server-side to onboarding + accounting);
 *  - the fleet is the user's own key list, so "last used" is a fact, not a
 *    mock telemetry feed.
 */
export function OverviewPage() {
	const session = useSession()

	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">Agent command center · {ENV_LABEL}</span>
					<h1>
						Wire an agent,
						<br />
						then watch what it does.
					</h1>
					<p className="lede">
						excited.live is built for agents first. This hub mints their keys, shows the exact
						MCP configuration each client needs, and lets you replay any call the API serves.
					</p>
				</div>
				<div className="row">
					<Link to="/data" className="btn signal">
						Open the data playground →
					</Link>
					<Link to="/tokens" className="btn secondary">
						Manage keys
					</Link>
				</div>
			</div>

			<div className="hero">
				<section className="card hero-main" aria-labelledby="mcp-config-heading">
					<McpConfigCard signedIn={Boolean(session)} />
				</section>
				<FleetCard signedIn={Boolean(session)} />
			</div>

			<section aria-labelledby="capabilities-heading" className="stack" style={{ gap: 14 }}>
				<div className="row spread">
					<h2 id="capabilities-heading">What an agent can reach today</h2>
					<span className="tiny muted">Every card deep-links into the Data tab</span>
				</div>
				<div className="grid-3">
					<Capability
						endpoint="get-api-v1-accounting-summary"
						title="Wealth & balance sheet"
						method="GET"
						path="/api/v1/accounting/summary"
						body="Assets, liabilities and net worth per entity, computed by @excited-live/accounting."
					/>
					<Capability
						endpoint="get-api-v1-accounting-ledger-yearMonth"
						title="Monthly ledger"
						method="GET"
						path="/api/v1/accounting/ledger/{yearMonth}"
						body="The computed month: income, spend, debt service, runway — the same numbers the agent reads."
					/>
					<Capability
						endpoint="post-api-v1-sim-simulate"
						title="Deterministic projection"
						method="POST"
						path="/api/v1/sim/simulate"
						body="Run @excited-live/sim on a plan input and get the yearly projection back."
					/>
					<Capability
						endpoint="get-api-v1-onboarding"
						title="Onboarding state"
						method="GET"
						path="/api/v1/onboarding"
						body="Which steps are done, and the MCP tools an agent used to complete them."
					/>
					<Capability
						endpoint="post-api-v1-accounting-expenses"
						title="Write an expense"
						method="POST"
						path="/api/v1/accounting/expenses"
						body="The smallest write an agent makes all day. Same shape over REST and MCP."
					/>
					<Capability
						endpoint="get-api-v1-agent-keys"
						title="Key audit"
						method="GET"
						path="/api/v1/agent-keys"
						body="90-day, scope-limited keys: who they belong to, when they were last used."
					/>
				</div>
			</section>

			<section className="card" aria-labelledby="how-heading">
				<div className="card-head">
					<div>
						<h2 id="how-heading">How this app is built</h2>
						<p>
							No server of our own sits between the browser and the API. That is the whole
							point of the move off TanStack Start.
						</p>
					</div>
					<span className="badge">single API</span>
				</div>
				<div className="grid-3">
					<div className="stack" style={{ gap: 4 }}>
						<strong className="small">1 · Direct origin</strong>
						<span className="small muted">
							Every request goes to <span className="mono">{API_URL}</span>.
						</span>
					</div>
					<div className="stack" style={{ gap: 4 }}>
						<strong className="small">2 · Bearer, not cookies</strong>
						<span className="small muted">
							The API resolves identity from <span className="mono">Authorization</span>; iam
							holds the token it was issued.
						</span>
					</div>
					<div className="stack" style={{ gap: 4 }}>
						<strong className="small">3 · One MCP surface</strong>
						<span className="small muted">
							Agents use <span className="mono">{MCP_URL}</span>, the same tools the Data tab
							inspects.
						</span>
					</div>
				</div>
			</section>
		</div>
	)
}

function Capability({ endpoint, title, method, path, body }: {
	endpoint: string
	title: string
	method: string
	path: string
	body: string
}) {
	return (
		<Link to="/data" search={{ endpoint }} className="capability">
			<span className="row" style={{ gap: 8 }}>
				<span className={`badge ${method.toLowerCase()}`}>{method}</span>
				<span className="mono muted">{path}</span>
			</span>
			<strong>{title}</strong>
			<p>{body}</p>
		</Link>
	)
}

function FleetCard({ signedIn }: { signedIn: boolean }) {
	const { keys, loading, error } = useAgentKeys(signedIn)

	const agents = useMemo(() => {
		const byAgent = new Map<string, { id: string; last: string | null; keys: number }>()
		for (const key of keys) {
			const id = key.agentId || key.name || "unlabelled agent"
			const existing = byAgent.get(id)
			const last = key.lastRequest
			byAgent.set(id, {
				id,
				last: existing?.last && last ? (existing.last > last ? existing.last : last) : (last ?? existing?.last ?? null),
				keys: (existing?.keys ?? 0) + 1,
			})
		}
		return [...byAgent.values()]
	}, [keys])

	return (
		<section className="card" aria-labelledby="fleet-heading">
			<div className="card-head">
				<div>
					<h2 id="fleet-heading">Your agent fleet</h2>
					<p>Built from your agent keys — nothing here is simulated.</p>
				</div>
				<span className="badge ok">{keys.length} key{keys.length === 1 ? "" : "s"}</span>
			</div>

			{!signedIn ? (
				<div className="empty" style={{ minHeight: 160 }}>
					<p className="small">Sign in to see the keys your agents are using.</p>
					<Link to="/sign-in" className="btn small">
						Sign in
					</Link>
				</div>
			) : loading ? (
				<p className="small muted">Reading keys…</p>
			) : error ? (
				<p className="small" style={{ color: "var(--iam-red)" }}>{error}</p>
			) : agents.length === 0 ? (
				<div className="empty" style={{ minHeight: 160 }}>
					<p className="small">No agent has a key yet. Mint one in the config card.</p>
				</div>
			) : (
				<div className="fleet">
					{agents.map((agent) => (
						<div key={agent.id} className="fleet-item" data-connected="true">
							<div>
								<strong>{agent.id}</strong>
								<span>
									{agent.keys} key{agent.keys === 1 ? "" : "s"} · last used {formatRelative(agent.last)}
								</span>
							</div>
							<span className="live-dot" aria-hidden="true" />
						</div>
					))}
				</div>
			)}

			<p className="tiny muted" style={{ margin: 0 }}>
				Tool count per agent is the server registry, not a per-key metric yet: 11 tools across
				onboarding and accounting.
			</p>
		</section>
	)
}

function McpConfigCard({ signedIn }: { signedIn: boolean }) {
	const [client, setClient] = useState<McpClientId>("claude")
	const [minted, setMinted] = useState<MintedAgentKey | null>(null)
	const [agentId, setAgentId] = useState("claude-desktop")
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		setMinted(recallMintedKey())
	}, [])

	const snippet = useMemo(() => mcpConfig(client, minted?.key ?? null), [client, minted])

	const mint = useCallback(async () => {
		setBusy(true)
		setError(null)
		try {
			const created = await mintAgentKey(agentId)
			rememberMintedKey(created)
			setMinted(created)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not mint a key")
		} finally {
			setBusy(false)
		}
	}, [agentId])

	const clear = () => {
		forgetMintedKey()
		setMinted(null)
	}

	return (
		<>
			<div className="card-head">
				<div>
					<h2 id="mcp-config-heading">1-click MCP config</h2>
					<p>
						Paste this into your client and it can call excited.live immediately. The key is
						scoped to onboarding and accounting, expires in 90 days, and can be revoked from
						API keys.
					</p>
				</div>
				<span className={`badge ${minted ? "ok" : "warn"}`}>{minted ? "key attached" : "no key yet"}</span>
			</div>

			<div className="segmented" role="tablist" aria-label="MCP client">
				{MCP_CLIENTS.map((option) => (
					<button
						key={option.id}
						type="button"
						role="tab"
						aria-selected={client === option.id}
						onClick={() => setClient(option.id)}
					>
						{option.label}
					</button>
				))}
			</div>

			<CodeDeck
				code={snippet}
				label={`${MCP_CLIENTS.find((option) => option.id === client)?.target ?? ""} · ${MCP_URL}`}
				wrap
			/>

			{signedIn ? (
				minted ? (
					<div className="row spread">
						<span className="tiny muted">
							Key <span className="mono">{minted.key.slice(0, 14)}…</span> · shown in full only
							until you mint the next one.
						</span>
						<button type="button" className="copy" onClick={clear}>
							Hide key
						</button>
					</div>
				) : (
					<div className="row" style={{ gap: 8 }}>
						<div className="field" style={{ flex: "1 1 180px" }}>
							<label htmlFor="agent-id">Agent id</label>
							<select
								id="agent-id"
								value={agentId}
								onChange={(event) => setAgentId(event.target.value)}
							>
								<option value="claude-desktop">claude-desktop</option>
								<option value="cursor">cursor</option>
								<option value="openmaus">openmaus</option>
								<option value="chatgpt">chatgpt</option>
								<option value="custom">custom</option>
							</select>
						</div>
						<button type="button" className="btn signal" onClick={mint} disabled={busy}>
							{busy ? "Minting…" : "Mint a key & inject it"}
						</button>
					</div>
				)
			) : (
				<div className="row spread">
					<span className="tiny muted">
						Sign in to mint a scoped key and fill the placeholder automatically.
					</span>
					<Link to="/sign-in" className="btn small">
						Sign in
					</Link>
				</div>
			)}

			{error ? <p className="auth-error">{error}</p> : null}
		</>
	)
}
