import { Link } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { CodeDeck } from "../components/CodeDeck"
import { formatRelative } from "../lib/format"
import {
	mintAgentKey,
	revokeAgentKey,
	useAgentKeys,
	type MintedAgentKey,
} from "../lib/queries"
import { useSession } from "../lib/session"

/**
 * API keys — the audit surface for everything an agent can do.
 *
 * Reads the same `GET /api/v1/agent-keys` the MCP config card mints from, so a
 * key that appears here is a key an agent is actually using. Revoking is a
 * hard delete on the API side; the row disappears after a reload.
 *
 * No scope editor yet: the API mints keys with a fixed permission set
 * (AGENT_KEY_PERMISSIONS: onboarding + accounting) and does not expose scope
 * changes per key. The page says that instead of pretending otherwise.
 */
export function TokensPage() {
	const session = useSession()
	const { keys, loading, error, reload } = useAgentKeys(Boolean(session))

	const [agentId, setAgentId] = useState("claude-desktop")
	const [name, setName] = useState("")
	const [minted, setMinted] = useState<MintedAgentKey | null>(null)
	const [busy, setBusy] = useState(false)
	const [failure, setFailure] = useState<string | null>(null)

	const mint = useCallback(async () => {
		setBusy(true)
		setFailure(null)
		try {
			const created = await mintAgentKey(agentId, name.trim() || undefined)
			setMinted(created)
			setName("")
			await reload()
		} catch (cause) {
			setFailure(cause instanceof Error ? cause.message : "Could not mint a key")
		} finally {
			setBusy(false)
		}
	}, [agentId, name, reload])

	const revoke = useCallback(
		async (id: string, label: string) => {
			if (!window.confirm(`Revoke ${label}? Any agent using it stops working immediately.`)) return
			setBusy(true)
			setFailure(null)
			try {
				await revokeAgentKey(id)
				await reload()
			} catch (cause) {
				setFailure(cause instanceof Error ? cause.message : "Could not revoke the key")
			} finally {
				setBusy(false)
			}
		},
		[reload],
	)

	if (!session) {
		return (
			<div className="page">
				<div className="page-head">
					<div>
						<span className="eyebrow">API keys &amp; scopes</span>
						<h1>Keys belong to an account.</h1>
						<p className="lede">
							Sign in to see every key your agents hold, when each was last used, and to revoke
							one.
						</p>
					</div>
					<Link to="/sign-in" search={{ returnPathname: "/tokens" }} className="btn signal">
						Sign in
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">API keys &amp; scopes · {session.user.email}</span>
					<h1>What your agents hold.</h1>
					<p className="lede">
						Every key below can call the same tools the Data tab shows. Revoke one and the agent
						loses access on its next request — no restart needed.
					</p>
				</div>
			</div>

			<section className="card" aria-labelledby="mint-heading">
				<div className="card-head">
					<div>
						<h2 id="mint-heading">Mint a key</h2>
						<p>
							Scoped to onboarding and accounting, valid for 90 days. The secret is shown once,
							right here.
						</p>
					</div>
					<span className="badge">{keys.length} active</span>
				</div>

				<div className="field-grid">
					<div className="field">
						<label htmlFor="agent">Agent</label>
						<select
							id="agent"
							value={agentId}
							onChange={(event) => setAgentId(event.target.value)}
							disabled={busy}
						>
							<option value="claude-desktop">claude-desktop</option>
							<option value="cursor">cursor</option>
							<option value="openmaus">openmaus</option>
							<option value="chatgpt">chatgpt</option>
							<option value="custom">custom</option>
						</select>
					</div>
					<div className="field">
						<label htmlFor="key-name">
							Label <em>optional</em>
						</label>
						<input
							id="key-name"
							type="text"
							placeholder="laptop"
							value={name}
							onChange={(event) => setName(event.target.value)}
							disabled={busy}
						/>
					</div>
				</div>

				<div className="row">
					<button type="button" className="btn signal" onClick={() => void mint()} disabled={busy}>
						{busy ? "Working…" : "Mint a key"}
					</button>
				</div>

				{minted ? (
					<div className="stack" style={{ gap: 8 }}>
						<CodeDeck code={minted.key} label="secret · shown once" wrap />
						<span className="tiny muted">
							{minted.name ?? minted.id} · expires {formatRelative(minted.expiresAt)}
						</span>
					</div>
				) : null}

				{failure ? (
					<p className="auth-error" role="alert">
						{failure}
					</p>
				) : null}
			</section>

			<section className="card" aria-labelledby="keys-heading">
				<div className="card-head">
					<div>
						<h2 id="keys-heading">Active keys</h2>
						<p>Newest first. “Last used” is the API’s own record, not a guess.</p>
					</div>
				</div>

				{error ? (
					<p className="auth-error" role="alert">
						{error}
					</p>
				) : loading ? (
					<p className="small muted">Reading keys…</p>
				) : keys.length === 0 ? (
					<div className="empty">
						<p className="small">No keys yet. Mint one above, or from the Overview card.</p>
					</div>
				) : (
					<div className="key-list">
						{keys.map((key) => (
							<div key={key.id} className="key-row">
								<div>
									<strong>{key.name ?? key.agentId ?? "agent key"}</strong>
									<div className="key-meta">
										<span className="mono">{key.start ?? "—"}…</span>
										<span>agent {key.agentId ?? "unknown"}</span>
										<span>created {formatRelative(key.createdAt)}</span>
										<span>expires {formatRelative(key.expiresAt)}</span>
										<span>last used {formatRelative(key.lastRequest)}</span>
									</div>
								</div>
								<button
									type="button"
									className="btn secondary"
									onClick={() => void revoke(key.id, key.name ?? key.agentId ?? "this key")}
									disabled={busy}
								>
									Revoke
								</button>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	)
}
