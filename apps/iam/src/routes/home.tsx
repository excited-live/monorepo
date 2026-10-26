import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { StatusBand } from "../components/StatusBand"
import { DOCS_URL, GITHUB_URL, MCP_GUIDE_URL } from "../lib/hosts"
import { useTranslator } from "../lib/i18n"
import { useSession } from "../lib/session"

/**
 * Home — the marketing page (#91).
 *
 * Signed out this is the front door: the Android hero, four ecosystem cards and
 * the product line. Signed in the status band opens above it, and the console
 * work stays on /mcp. Nothing here mints or reads a key.
 *
 * Sign-up stays in the hub (#127): the CTA is a `Link` to `/sign-in?mode=signup`,
 * the route that mints iam's own bearer session. Linking the webapp auth host
 * would sign the visitor into a different app and return them still signed out.
 * External hosts (docs, the repo) live in `lib/hosts.ts`.
 *
 * Play Store gate: the Android listing returned 404 at build time, so the CTA
 * is a disabled badge and the store URL is deliberately absent from this file.
 * When the listing is live, change `PLAY_STORE_LIVE` and add the href (and the
 * QR) in the same commit.
 */
const PLAY_STORE_LIVE = false

export function HomePage() {
	const session = useSession()
	const { t, toggleLocale } = useTranslator()
	const name = session ? session.user.name || session.user.email.split("@")[0] || session.user.email : ""

	return (
		<div className="home">
			<StatusBand />

			<div className="page home-page">
				{session ? <p className="home-greeting">{t("home.greeting", { name })}</p> : null}

				<section className="home-hero" aria-labelledby="home-title">
					<div className="home-hero-copy">
						<span className="eyebrow">{t("home.eyebrow")}</span>
						<h1 id="home-title">{t("home.title")}</h1>
						<p className="lede">{t("home.body")}</p>
						<div className="home-actions">
							<span className="store-gate" aria-disabled={!PLAY_STORE_LIVE}>
								{PLAY_STORE_LIVE ? t("home.cta.get") : t("home.cta.gated")}
							</span>
							{session ? (
								<Link to="/mcp" className="btn secondary">
									{t("home.cta.mcp")}
								</Link>
							) : (
								<Link to="/sign-in" search={{ mode: "signup" }} className="btn secondary">
									{t("home.cta.create")}
								</Link>
							)}
						</div>
					</div>

					<aside className="home-store" aria-label={t("home.store.heading")}>
						<span className="home-store-eyebrow">{t("home.store.heading")}</span>
						<div className="home-store-row">
							<span className="home-store-name">{t("home.store.play")}</span>
							<span className="badge">{PLAY_STORE_LIVE ? t("home.cta.get") : t("home.store.playStatus")}</span>
						</div>
						<div className="home-store-row">
							<span className="home-store-name">{t("home.store.apple")}</span>
							<span className="badge">{t("home.store.appleStatus")}</span>
						</div>
						<p className="tiny muted home-store-caption">{t("home.store.caption")}</p>
					</aside>
				</section>

				<section className="home-grid" aria-label={t("nav.mcp")}>
					<HomeCard
						title={t("home.cards.mcp.title")}
						body={t("home.cards.mcp.body")}
						to="/mcp"
						icon="mcp"
					/>
					<HomeCard
						title={t("home.cards.keys.title")}
						body={t("home.cards.keys.body")}
						to="/tokens"
						icon="key"
					/>
					<HomeCard
						title={t("home.cards.data.title")}
						body={t("home.cards.data.body")}
						to="/data"
						icon="data"
					/>
					<a className="home-card" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
						<span className="home-card-icon" aria-hidden="true">
							<CardIcon icon="code" />
						</span>
						<span className="home-card-title">{t("home.cards.os.title")}</span>
						<span className="home-card-body">{t("home.cards.os.body")}</span>
						<span className="home-card-open" aria-hidden="true">
							↗
						</span>
					</a>
				</section>

				<p className="home-summary">{t("home.summary")}</p>
			</div>

			<footer className="home-footer">
				<div className="home-footer-inner">
					{!session ? <p className="home-footer-note">{t("home.footer.note")}</p> : null}

					<div className="home-footer-grid">
						<div className="home-footer-brand">
							<span className="brand-name">
								excited<em>.live</em>
							</span>
							<p className="small muted">{t("footer.tagline")}</p>
						</div>

						<FooterColumn heading={t("footer.product")}>
							<Link to="/">{t("nav.home")}</Link>
							<Link to="/mcp">{t("nav.mcp")}</Link>
							<Link to="/tokens">{t("nav.tokens")}</Link>
							<Link to="/data">{t("nav.data")}</Link>
						</FooterColumn>

						<FooterColumn heading={t("footer.ecosystem")}>
							<a href={MCP_GUIDE_URL}>{t("footer.docsMcp")}</a>
							<a href={DOCS_URL}>{t("footer.docs")}</a>
							<a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
								{t("footer.github")}
							</a>
						</FooterColumn>

						<FooterColumn heading={t("footer.governance")}>
							<a href={`${DOCS_URL}/privacy`}>{t("footer.privacy")}</a>
							<a href={`${DOCS_URL}/terms`}>{t("footer.terms")}</a>
						</FooterColumn>
					</div>

					<div className="home-footer-bottom">
						<span className="tiny muted">© 2026 excited.live · Apache-2.0</span>
						<button type="button" className="locale-pill" onClick={toggleLocale}>
							{t("nav.locale")}
						</button>
					</div>
				</div>
			</footer>
		</div>
	)
}

function FooterColumn({ heading, children }: { heading: string; children: ReactNode }) {
	return (
		<div className="home-footer-col">
			<h2>{heading}</h2>
			{children}
		</div>
	)
}

function HomeCard({
	title,
	body,
	to,
	icon,
}: {
	title: string
	body: string
	to: "/mcp" | "/tokens" | "/data"
	icon: "mcp" | "key" | "data"
}) {
	return (
		<Link to={to} className="home-card">
			<span className="home-card-icon" aria-hidden="true">
				<CardIcon icon={icon} />
			</span>
			<span className="home-card-title">{title}</span>
			<span className="home-card-body">{body}</span>
			<span className="home-card-open" aria-hidden="true">
				→
			</span>
		</Link>
	)
}

function CardIcon({ icon }: { icon: "mcp" | "key" | "data" | "code" }) {
	if (icon === "key") {
		return (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
				<circle cx="7.5" cy="15.5" r="4.5" />
				<path d="M11 12l9-9M17 6l2 2M14 9l2 2" />
			</svg>
		)
	}
	if (icon === "data") {
		return (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
				<ellipse cx="12" cy="5" rx="8" ry="3" />
				<path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
				<path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
			</svg>
		)
	}
	if (icon === "code") {
		return (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
				<path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
			</svg>
		)
	}
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
			<rect x="4" y="4" width="16" height="16" rx="3" />
			<rect x="9" y="9" width="6" height="6" rx="1" />
			<path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
		</svg>
	)
}
