import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import {
	MIN_PASSWORD_LENGTH,
	type AuthMode,
	type SignUpErrorKind,
	sanitizeReturnPath,
	signUpErrorKind,
} from "@excited-live/auth/flow"
import { useTranslator } from "../lib/i18n"
import { signIn, signOut, signUp } from "../lib/hub-auth"
import { useSession } from "../lib/session"

/**
 * Sign-in / create-account for the hub itself.
 *
 * This is **not** the OAuth consent page: consent and device approval stay on
 * the authorization-server origin (the webapp's cookie mount), because that is
 * the origin that issues the agent's token. Here the browser gets its own
 * bearer token from the API's tokens mount (`lib/hub-auth.ts`), which is what a
 * no-BFF SPA can hold.
 *
 * `returnPathname` is honoured after sign-in so a deep link (e.g. a Data tab
 * request someone shared) lands where it pointed. Only same-origin absolute
 * paths are accepted — the sanitizer is shared with the webapp via
 * `@excited-live/auth/flow`.
 */

const SIGN_UP_ERROR_KEY: Record<SignUpErrorKind, string> = {
	duplicate: "auth.signUpError.duplicate",
	invalidEmail: "auth.signUpError.invalidEmail",
	weakPassword: "auth.signUpError.weakPassword",
	generic: "auth.error.generic",
}

export function SignInPage() {
	const search = useSearch({ strict: false }) as { mode?: AuthMode; returnPathname?: string }
	const navigate = useNavigate()
	const session = useSession()
	const { t, toggleLocale } = useTranslator()

	const [mode, setMode] = useState<AuthMode>(search.mode === "signup" ? "signup" : "signin")
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const isSignUp = mode === "signup"
	const destination = sanitizeReturnPath(search.returnPathname)

	const finish = async () => {
		await navigate({ to: destination })
	}

	const submit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (busy) return
		setError(null)

		if (isSignUp) {
			if (!name.trim()) {
				setError(t("auth.signUpError.nameRequired"))
				return
			}
			if (password.length < MIN_PASSWORD_LENGTH) {
				setError(t("auth.signUpError.weakPassword"))
				return
			}
		}

		setBusy(true)
		try {
			if (isSignUp) {
				await signUp(name.trim(), email.trim(), password)
			} else {
				await signIn(email.trim(), password)
			}
			await finish()
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : ""
			if (isSignUp) {
				setError(t(SIGN_UP_ERROR_KEY[signUpErrorKind({ message })]))
			} else {
				setError(t("auth.error.invalidCredentials"))
			}
		} finally {
			setBusy(false)
		}
	}

	const handleSignOut = async () => {
		setBusy(true)
		try {
			await signOut()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="auth-page">
			<div className="auth-card">
				<div className="auth-brand">
					<span className="eyebrow">iam.excited.live</span>
					<button type="button" className="auth-switch" onClick={toggleLocale}>
						{t("auth.locale.switch")}
					</button>
				</div>

				{session ? (
					<>
						<div className="stack" style={{ gap: 6 }}>
							<h1 style={{ fontSize: 22 }}>{t("auth.alreadySignedInTitle")}</h1>
							<p className="auth-hint">{t("auth.alreadySignedIn", { email: session.user.email })}</p>
						</div>
						<div className="row" style={{ gap: 8 }}>
							<button type="button" className="btn signal" onClick={() => void finish()} disabled={busy}>
								{t("auth.continue")}
							</button>
							<button type="button" className="btn secondary" onClick={handleSignOut} disabled={busy}>
								{t("auth.signOut")}
							</button>
						</div>
					</>
				) : (
					<>
						<div className="stack" style={{ gap: 6 }}>
							<h1 style={{ fontSize: 22 }}>
								{t(isSignUp ? "auth.signUpTitle" : "auth.signInTitle")}
							</h1>
							<p className="auth-hint">
								{t(isSignUp ? "auth.signUpSubtitle" : "auth.signInSubtitle")}
							</p>
						</div>

						<form onSubmit={submit}>
							{isSignUp ? (
								<div className="field">
									<label htmlFor="name">{t("auth.name")}</label>
									<input
										id="name"
										type="text"
										autoComplete="name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										required
										disabled={busy}
									/>
								</div>
							) : null}

							<div className="field">
								<label htmlFor="email">{t("auth.email")}</label>
								<input
									id="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
									disabled={busy}
								/>
							</div>

							<div className="field">
								<label htmlFor="password">{t("auth.password")}</label>
								<input
									id="password"
									type="password"
									autoComplete={isSignUp ? "new-password" : "current-password"}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
									disabled={busy}
								/>
								{isSignUp ? <small>{t("auth.passwordHint")}</small> : null}
							</div>

							{error ? (
								<p className="auth-error" role="alert">
									{error}
								</p>
							) : null}

							<button type="submit" className="btn signal" disabled={busy}>
								{busy ? "…" : t(isSignUp ? "auth.createAccount" : "auth.signIn")}
							</button>
						</form>

						<div className="auth-links">
							<button
								type="button"
								className="auth-switch"
								onClick={() => {
									setMode(isSignUp ? "signin" : "signup")
									setError(null)
								}}
								disabled={busy}
							>
								{t(isSignUp ? "auth.switchToSignIn" : "auth.switchToSignUp")}
							</button>
						</div>

						<p className="auth-hint">
							Google sign-in is not offered here yet: a redirect cannot hand this app its
							bearer token. Use the email and password your account already has.
						</p>
					</>
				)}
			</div>
		</div>
	)
}
