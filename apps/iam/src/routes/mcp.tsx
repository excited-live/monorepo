import { Link } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CodeDeck } from "../components/CodeDeck"
import { API_URL, ENV_LABEL, MCP_URL } from "../lib/env"
import { formatRelative } from "../lib/format"
import { useTranslator } from "../lib/i18n"
import { MCP_CLIENTS, mcpConfig, type McpClientId } from "../lib/snippets"
import {
	forgetMintedKey,
	mintAgentKey,
	recallMintedKey,
	rememberMintedKey,
	useAgentKeys,
	useMcpTools,
	type MintedAgentKey,
} from "../lib/queries"
import { useSession } from "../lib/session"

/**
 * MCP Agents — the agent console (#91).
 *
 * This is the old Overview, moved to its own tab so Home can be marketing.
 * Three honest sources of truth:
 *  - the MCP config card renders a real endpoint and a real key (minted by
 *    `POST /api/v1/agent-keys`, scoped server-side to onboarding + accounting);
 *  - the fleet is the user's own key list, so "last used" is a fact, not a
 *    mock telemetry feed;
 *  - the tool registry is read live through `tools/list`, never a fixture.
 */
export function McpAgentsPage() {
	const session = useSession()
	const { t } = useTranslator()

	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">{t("mcp.eyebrow", { env: ENV_LABEL })}</span>
					<h1>{t("mcp.title")}</h1>
					<p className="lede">{t("mcp.lede")}</p>
				</div>
				<div className="row">
					<Link to="/data" className="btn signal">
						{t("mcp.openPlayground")}
					</Link>
					<Link to="/tokens" className="btn secondary">
						{t("mcp.manageKeys")}
					</Link>
				</div>
			</div>

			<div className="hero">
				<section className="card hero-main" aria-labelledby="mcp-config-heading">
					<McpConfigCard signedIn={Boolean(session)} />
				</section>
				<FleetCard signedIn={Boolean(session)} />
			</div>

			<ToolRegistry signedIn={Boolean(session)} />

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
						endpoint="get-api-v1-accounting-projection"
						title="Treasury projection"
						method="GET"
						path="/api/v1/accounting/projection"
						body="120-month treasury balance projection around a centre month."
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

/**
 * The live registry. Signed out it shows no names at all — a hard-coded list is
 * exactly the drift #90 exists to remove.
 */
function ToolRegistry({ signedIn }: { signedIn: boolean }) {
	const { t } = useTranslator()
	const { tools, loading, error, reload } = useMcpTools(signedIn)

	return (
		<section className="card" aria-labelledby="tools-heading">
			<div className="card-head">
				<div>
					<h2 id="tools-heading">{t("mcp.registry.title")}</h2>
					<p>{t("mcp.registry.body")}</p>
				</div>
				{signedIn && !loading && !error ? (
					<span className="badge ok">{t("mcp.registry.count", { n: String(tools.length) })}</span>
				) : null}
			</div>

			{!signedIn ? (
				<div className="empty" style={{ minHeight: 120 }}>
					<p className="small" style={{ margin: 0 }}>{t("mcp.registry.signin")}</p>
					<Link to="/sign-in" search={{ returnPathname: "/mcp" }} className="btn small">
						{t("auth.signIn")}
					</Link>
				</div>
			) : loading ? (
				<p className="small muted">{t("mcp.registry.loading")}</p>
			) : error ? (
				<div className="row spread">
					<p className="small" style={{ color: "var(--iam-red)", margin: 0 }}>
						{t("mcp.registry.error", { message: error })}
					</p>
					<button type="button" className="btn small secondary" onClick={() => void reload()}>
						{t("mcp.registry.retry")}
					</button>
				</div>
			) : (
				<ul className="tool-list">
					{tools.map((tool) => (
						<li key={tool.name} className="tool-item">
							<div className="row" style={{ gap: 8 }}>
								<strong className="small">{tool.title ?? tool.name}</strong>
								<span className="mono muted">{tool.name}</span>
							</div>
							{tool.description ? <p className="tiny muted">{tool.description}</p> : null}
						</li>
					))}
				</ul>
			)}
		</section>
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
	const { t } = useTranslator()
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
				{t("mcp.fleet.note")}
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
			// The config card exists to run an agent that can set the books up, so
			// it asks for the write grant explicitly: a mint without `scopes` is
			// read-only since #161.
			const created = await mintAgentKey(agentId, undefined, [
				"onboarding:read",
				"onboarding:write",
				"accounting:read",
				"accounting:write",
			])
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
