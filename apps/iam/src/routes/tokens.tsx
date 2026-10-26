import { Link } from "@tanstack/react-router"
import { useCallback, useRef, useState } from "react"
import { CodeDeck } from "../components/CodeDeck"
import { keyState, formatResetClock } from "../lib/budget"
import { formatRelative } from "../lib/format"
import { MCP_GUIDE_URL } from "../lib/hosts"
import { useTranslator } from "../lib/i18n"
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
 * The budget row and the paused state (#156) read the API's own counters
 * (`key.rateLimit`, the same numbers as `X-RateLimit-*` on `/mcp`). The page
 * never counts calls locally: a key used from two editors would otherwise show
 * two different remaining values, and the wall would appear after the API had
 * already refused the agent.
 *
 * No scope control yet: the API mints keys with a fixed permission set
 * (AGENT_KEY_PERMISSIONS: onboarding + accounting) and does not expose a
 * per-key scope choice. The capability line says the verb today so "scoped"
 * cannot be read as "read-only" (#161 R1/R3).
 */
export function TokensPage() {
	const session = useSession()
	const { keys, loading, error, reload } = useAgentKeys(Boolean(session))
	const { t, locale } = useTranslator()

	const [agentId, setAgentId] = useState("claude-desktop")
	const [name, setName] = useState("")
	const [minted, setMinted] = useState<MintedAgentKey | null>(null)
	const [busy, setBusy] = useState(false)
	const [failure, setFailure] = useState<string | null>(null)

	const mintHeading = useRef<HTMLHeadingElement>(null)

	const focusMint = useCallback(() => {
		mintHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" })
		document.getElementById("agent")?.focus({ preventScroll: true })
	}, [])

	const mint = useCallback(async () => {
		setBusy(true)
		setFailure(null)
		try {
			const created = await mintAgentKey(agentId, name.trim() || undefined)
			setMinted(created)
			setName("")
			await reload()
		} catch (cause) {
			setFailure(cause instanceof Error ? cause.message : t("tokens.mint.failed"))
		} finally {
			setBusy(false)
		}
	}, [agentId, name, reload, t])

	const revoke = useCallback(
		async (id: string, label: string) => {
			if (!window.confirm(t("tokens.key.revokeConfirm", { label }))) return
			setBusy(true)
			setFailure(null)
			try {
				await revokeAgentKey(id)
				await reload()
			} catch (cause) {
				setFailure(cause instanceof Error ? cause.message : t("tokens.key.revokeFailed"))
			} finally {
				setBusy(false)
			}
		},
		[reload, t],
	)

	if (!session) {
		return (
			<div className="page">
				<div className="page-head">
					<div>
						<span className="eyebrow">{t("tokens.eyebrow")}</span>
						<h1>{t("tokens.signedOut.title")}</h1>
						<p className="lede">{t("tokens.signedOut.lede")}</p>
					</div>
					<Link to="/sign-in" search={{ returnPathname: "/tokens" }} className="btn signal">
						{t("auth.signIn")}
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">
						{t("tokens.eyebrow")} · {session.user.email}
					</span>
					<h1>{t("tokens.title")}</h1>
					<p className="lede">{t("tokens.lede")}</p>
				</div>
			</div>

			<section className="card" aria-labelledby="mint-heading">
				<div className="card-head">
					<div>
						<h2 id="mint-heading" ref={mintHeading} tabIndex={-1}>
							{t("tokens.mint.title")}
						</h2>
						<p>
							{t("tokens.mint.scope_line")} {t("tokens.mint.terms")}
						</p>
					</div>
					<span className="badge">{t("tokens.mint.active", { n: String(keys.length) })}</span>
				</div>

				<div className="field-grid">
					<div className="field">
						<label htmlFor="agent">{t("tokens.mint.agent")}</label>
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
							{t("tokens.mint.label")} <em>{t("tokens.mint.optional")}</em>
						</label>
						<input
							id="key-name"
							type="text"
							placeholder={t("tokens.mint.labelPlaceholder")}
							value={name}
							onChange={(event) => setName(event.target.value)}
							disabled={busy}
						/>
					</div>
				</div>

				<div className="row">
					<button type="button" className="btn signal" onClick={() => void mint()} disabled={busy}>
						{busy ? t("tokens.mint.working") : t("tokens.mint.submit")}
					</button>
				</div>

				{minted ? (
					<div className="stack" style={{ gap: 8 }}>
						<CodeDeck code={minted.key} label={t("tokens.mint.secretLabel")} wrap />
						<span className="tiny muted">
							{minted.name ?? minted.id} · {t("tokens.mint.expires", { time: formatRelative(minted.expiresAt) })}
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
						<h2 id="keys-heading">{t("tokens.keys.title")}</h2>
						<p>{t("tokens.keys.sub")}</p>
					</div>
				</div>

				{error ? (
					<p className="auth-error" role="alert">
						{error}
					</p>
				) : loading ? (
					<p className="small muted">{t("tokens.keys.loading")}</p>
				) : keys.length === 0 ? (
					<div className="empty">
						<p className="small">{t("tokens.keys.empty")}</p>
					</div>
				) : (
					<div className="key-list">
						{keys.map((key) => {
							const label = key.name ?? key.agentId ?? "agent key"
							const state = keyState(key)

							if (state.kind === "dead") {
								return (
									<div key={key.id} className="key-row">
										<div>
											<strong>{label}</strong>
											<div className="key-state">
												<span className="key-state-label">{t("tokens.state.dead")}</span>
												<div className="key-state-actions">
													<button type="button" className="link-quiet" onClick={focusMint}>
														{t("tokens.state.dead.next")}
													</button>
													<a className="link-quiet" href={MCP_GUIDE_URL}>
														{t("tokens.state.dead.setup")}
													</a>
												</div>
											</div>
										</div>
									</div>
								)
							}

							return (
								<div key={key.id} className="key-row">
									<div>
										<strong>{label}</strong>
										<div className="key-capability">{t("tokens.key.capability")}</div>
										<div className="key-meta">
											<span className="mono">{key.start ?? "—"}…</span>
											<span>{t("tokens.key.agent", { id: key.agentId ?? "unknown" })}</span>
											<span>{t("tokens.key.created", { time: formatRelative(key.createdAt) })}</span>
											<span>{t("tokens.key.expires", { time: formatRelative(key.expiresAt) })}</span>
											<span>{t("tokens.key.lastUsed", { time: formatRelative(key.lastRequest) })}</span>
										</div>

										{state.kind === "active" ? (
											<p className="key-budget">
												<span>
													{t("tokens.budget.remaining", {
														n: String(state.remaining),
														limit: String(state.limit),
													})}
												</span>
												{state.resetAt !== null ? (
													<span className="key-budget-reset muted">
														{t("tokens.budget.reset", {
															time: formatResetClock(state.resetAt, locale),
														})}
													</span>
												) : null}
											</p>
										) : null}

										{state.kind === "paused" ? (
											<div className="key-state">
												<span className="key-state-label">
													{t("tokens.state.paused", {
														time: formatResetClock(state.resetAt, locale),
													})}
												</span>
												<p className="key-state-body">
													{t("tokens.state.paused.body", {
														limit: String(state.limit),
														time: formatResetClock(state.resetAt, locale),
													})}
												</p>
												<p className="key-state-next">
													{t("tokens.state.paused.next", { limit: String(state.limit) })}{" "}
													<button type="button" className="link-quiet" onClick={focusMint}>
														{t("tokens.state.paused.mint")}
													</button>
												</p>
											</div>
										) : null}
									</div>
									<button
										type="button"
										className="btn secondary"
										onClick={() => void revoke(key.id, label)}
										disabled={busy}
									>
										{t("tokens.key.revoke")}
									</button>
								</div>
							)
						})}
					</div>
				)}
			</section>
		</div>
	)
}
