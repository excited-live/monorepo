import { Link } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { API_URL } from "../lib/env"
import { useTranslator } from "../lib/i18n"
import { useApiHealth, useOnboarding, type ApiState } from "../lib/queries"
import { signOut } from "../lib/hub-auth"
import { useSession } from "../lib/session"

/**
 * The command center band (#92, Pita's 10:20 placement note).
 *
 * Signed-in Home only: first element in the content area, above the Android
 * hero. It is read-only, expands in place, and always starts collapsed so a
 * phone never opens into a tall panel. No fifth tab, no repeat on /mcp.
 */
const STEP_IDS = [
	"create_account",
	"add_business",
	"assets_wallet",
	"add_liability",
	"add_income",
	"add_expense",
] as const

const STATE_LABEL: Record<ApiState, string> = {
	ok: "band.api_ok",
	degraded: "band.api_degraded",
	down: "band.api_down",
	unknown: "band.api_unknown",
}

export function StatusBand() {
	const session = useSession()
	const { t } = useTranslator()
	const health = useApiHealth()
	const onboarding = useOnboarding(Boolean(session))
	const [open, setOpen] = useState(false)
	const [signingOut, setSigningOut] = useState(false)

	const handleSignOut = useCallback(async () => {
		setSigningOut(true)
		try {
			await signOut()
		} finally {
			setSigningOut(false)
		}
	}, [])

	// Signed-out Home renders no band at all: no placeholder, no invitation.
	if (!session) return null

	const done = new Set(onboarding.state?.done ?? [])
	const skipped = new Set(onboarding.state?.skipped ?? [])
	const completed = STEP_IDS.filter((id) => done.has(id)).length
	const nextStep = STEP_IDS.find((id) => !done.has(id) && !skipped.has(id))
	const isComplete = !nextStep
	const email = session.user.email

	const tileError = onboarding.error ? t("band.error", { message: onboarding.error }) : null

	return (
		<section className="status-band" aria-label={t("band.account")} data-open={open ? "true" : "false"}>
			<button
				type="button"
				className="status-band-summary"
				aria-expanded={open}
				aria-controls="status-band-panel"
				onClick={() => setOpen((value) => !value)}
				title={open ? t("band.collapse") : t("band.expand")}
			>
				<span className="band-dot" data-state={health.state} aria-hidden="true" />
				<span className="band-status">{t(STATE_LABEL[health.state])}</span>
				<span className="band-email">{email}</span>
				<span className="band-count" aria-label={t("band.steps", { n: String(completed) })}>
					{onboarding.error ? "—/6" : `${completed}/6`}
				</span>
				<span className="band-chevron" aria-hidden="true">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M6 9l6 6 6-6" />
					</svg>
				</span>
			</button>

			{open ? (
				<div className="status-band-panel" id="status-band-panel">
					<div className="band-tile">
						<span className="band-k">{t("band.account")}</span>
						<span className="band-v">{email}</span>
						<span className="band-m">
							<button type="button" className="band-link" onClick={() => void handleSignOut()} disabled={signingOut}>
								{t("band.signout")}
							</button>
						</span>
					</div>

					<div className="band-tile">
						<span className="band-k">{t("band.onboarding_title")}</span>
						<span className="band-v">{t("band.steps", { n: String(completed) })}</span>
						<span className="band-m">
							{tileError ? (
								tileError
							) : isComplete ? (
								t("band.resume")
							) : (
								<>
									{t("band.next", { step: nextStep ? t(`step.${nextStep}`) : "" })} ·{" "}
									<Link to="/mcp" className="band-continue">
										{t("band.continue")} →
									</Link>
								</>
							)}
						</span>
					</div>

					<div className="band-tile">
						<span className="band-k">{t("band.api_title")}</span>
						<span className="band-v">
							<span className="band-dot" data-state={health.state} aria-hidden="true" />
							{t(STATE_LABEL[health.state])}
						</span>
						<span className="band-m">
							{apiHost} · {t("band.checked")}
						</span>
					</div>
				</div>
			) : null}
		</section>
	)
}

/** Display-only host of the API origin; the health hook owns the request. */
const apiHost = safeHost(API_URL)

function safeHost(value: string): string {
	try {
		return new URL(value).host
	} catch {
		return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
	}
}
