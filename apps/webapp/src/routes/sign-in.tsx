import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { mastercardTheme } from "@excited-live/design-system"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import { Theme } from "@astryxdesign/core/theme"
import { createAuthClient } from "@excited-live/auth/client"
import { betterAuthConfigured, googleProviderConfig } from "../lib/auth-config"
import { getAuth } from "../lib/auth"
import {
	MIN_PASSWORD_LENGTH,
	type AuthMode,
	type SignUpErrorKind,
	parseAuthMode,
	postAuthDestination,
	signUpErrorKind,
} from "../lib/auth-flow"
import { useLocale } from "../lib/locale-context"

/**
 * Sign-in / create-account page (Better Auth). Replaces the hosted AuthKit
 * page from the WorkOS integration. Reachable signed out (the guard exempts
 * /sign-in); renders a clear notice when auth is not configured in this
 * environment (previews, local mock work).
 *
 * Both modes share the resume logic: an MCP OAuth authorization query or a
 * device-flow `returnPathname` must survive account creation exactly as it
 * survives sign-in (see lib/auth-flow.ts).
 */
const getSignInConfig = createServerFn({ method: "GET" }).handler(async () => {
	if (!betterAuthConfigured()) {
		return { configured: false as const, googleEnabled: false, user: null }
	}
	const auth = await getAuth()
	const session = await auth.api.getSession({ headers: getRequestHeaders() })
	return {
		configured: true as const,
		googleEnabled: Boolean(googleProviderConfig()),
		user: session?.user ? { email: session.user.email } : null,
	}
})

interface SignInSearch {
	returnPathname?: string
	mode?: AuthMode
}

const SIGN_UP_ERROR_KEY: Record<SignUpErrorKind, string> = {
	duplicate: "auth.signUpError.duplicate",
	invalidEmail: "auth.signUpError.invalidEmail",
	weakPassword: "auth.signUpError.weakPassword",
	generic: "auth.error.generic",
}

export const Route = createFileRoute("/sign-in")({
	validateSearch: (search: Record<string, unknown>): SignInSearch => ({
		returnPathname: typeof search.returnPathname === "string" ? search.returnPathname : undefined,
		mode: search.mode === "signup" || search.mode === "signin" ? search.mode : undefined,
	}),
	loader: async () => getSignInConfig(),
	component: SignInPage,
})

function SignInPage() {
	const { t } = useLocale()
	const navigate = useNavigate()
	const { configured, googleEnabled, user } = Route.useLoaderData()
	const { returnPathname, mode: modeParam } = Route.useSearch()

	const authClient = createAuthClient()

	const [mode, setMode] = useState<AuthMode>(parseAuthMode(modeParam))
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const switchMode = (next: AuthMode) => {
		setMode(next)
		setError(null)
		if (typeof window === "undefined") return
		// Keep the raw flow query (client_id/sig or returnPathname) intact while
		// changing only our own mode param.
		const url = new URL(window.location.href)
		if (next === "signup") url.searchParams.set("mode", "signup")
		else url.searchParams.delete("mode")
		window.history.replaceState(
			window.history.state,
			"",
			`${url.pathname}${url.search}${url.hash}`,
		)
	}

	/**
	 * Resume the OAuth/device flow when this page was part of one. The OAuth
	 * authorize endpoint needs a full navigation (the provider sets cookies and
	 * redirects onwards); a plain return path can use the router.
	 */
	const finishAuth = async () => {
		const destination = postAuthDestination(
			typeof window === "undefined" ? "" : window.location.search,
			returnPathname,
		)
		if (destination.startsWith("/api/auth/")) {
			window.location.assign(destination)
			return
		}
		await navigate({ to: destination })
	}

	const signInWithEmail = async (event: React.FormEvent) => {
		event.preventDefault()
		setBusy(true)
		setError(null)
		try {
			const { error: signInError } = await authClient.signIn.email({ email, password })
			if (signInError) {
				setError(t("auth.error.invalidCredentials"))
				return
			}
			await finishAuth()
		} catch {
			setError(t("auth.error.generic"))
		} finally {
			setBusy(false)
		}
	}

	const signUpWithEmail = async (event: React.FormEvent) => {
		event.preventDefault()
		if (busy) return
		if (!name.trim()) {
			setError(t("auth.signUpError.nameRequired"))
			return
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			setError(t("auth.signUpError.weakPassword"))
			return
		}
		setBusy(true)
		setError(null)
		try {
			const { error: signUpError } = await authClient.signUp.email({
				name: name.trim(),
				email: email.trim(),
				password,
			})
			if (signUpError) {
				setError(t(SIGN_UP_ERROR_KEY[signUpErrorKind(signUpError)]))
				return
			}
			// Better Auth signs the new user in (session cookie) before we resume.
			await finishAuth()
		} catch {
			setError(t("auth.error.generic"))
		} finally {
			setBusy(false)
		}
	}

	const signInWithGoogle = async () => {
		setBusy(true)
		setError(null)
		try {
			const destination = postAuthDestination(
				typeof window === "undefined" ? "" : window.location.search,
				returnPathname,
			)
			await authClient.signIn.social({ provider: "google", callbackURL: destination })
		} catch {
			setError(t("auth.error.generic"))
			setBusy(false)
		}
	}

	const continueAsUser = async () => {
		setBusy(true)
		try {
			await finishAuth()
		} finally {
			setBusy(false)
		}
	}

	const signOutAndReload = async () => {
		setBusy(true)
		try {
			await authClient.signOut()
		} finally {
			window.location.reload()
		}
	}

	if (!configured) {
		return (
			<Theme theme={mastercardTheme} mode="light">
				<Stack className="signin-page">
					<Card className="signin-card">
						<Stack gap={2}>
							<Heading level={2}>{t("auth.signInTitle")}</Heading>
							<Text color="secondary">{t("auth.notConfigured")}</Text>
						</Stack>
					</Card>
				</Stack>
			</Theme>
		)
	}

	if (user) {
		return (
			<Theme theme={mastercardTheme} mode="light">
				<Stack className="signin-page">
					<Card className="signin-card">
						<Stack gap={3}>
							<Stack gap={1}>
								<Heading level={2}>{t("auth.alreadySignedInTitle")}</Heading>
								<Text color="secondary">
									{t("auth.alreadySignedIn", { email: user.email })}
								</Text>
							</Stack>
							<Button
								label={t("auth.continue")}
								isLoading={busy}
								isDisabled={busy}
								onClick={continueAsUser}
							/>
							<Button
								variant="ghost"
								label={t("auth.signOut")}
								isDisabled={busy}
								onClick={signOutAndReload}
							/>
						</Stack>
					</Card>
				</Stack>
			</Theme>
		)
	}

	const isSignUp = mode === "signup"

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="signin-page">
				<Card className="signin-card">
					<Stack
						as="form"
						onSubmit={isSignUp ? signUpWithEmail : signInWithEmail}
						gap={3}
					>
						<Stack gap={1}>
							<Heading level={2}>
								{t(isSignUp ? "auth.signUpTitle" : "auth.signInTitle")}
							</Heading>
							<Text color="secondary">
								{t(isSignUp ? "auth.signUpSubtitle" : "auth.signInSubtitle")}
							</Text>
						</Stack>
						{isSignUp ? (
							<TextInput
								label={t("auth.name")}
								type="text"
								autoComplete="name"
								value={name}
								onChange={setName}
								isRequired
								isDisabled={busy}
							/>
						) : null}
						<TextInput
							label={t("auth.email")}
							type="email"
							autoComplete="email"
							value={email}
							onChange={setEmail}
							isRequired
							isDisabled={busy}
						/>
						<TextInput
							label={t("auth.password")}
							type="password"
							autoComplete={isSignUp ? "new-password" : "current-password"}
							description={isSignUp ? t("auth.passwordHint") : undefined}
							value={password}
							onChange={setPassword}
							isRequired
							isDisabled={busy}
						/>
						{error ? (
							<Text size="sm" className="signin-error" role="alert">
								{error}
							</Text>
						) : null}
						<Stack gap={2}>
							<Button
								type="submit"
								label={t(isSignUp ? "auth.createAccount" : "auth.signIn")}
								isLoading={busy}
								isDisabled={busy}
							/>
							{googleEnabled ? (
								<Button
									variant="secondary"
									label={t("auth.continueWithGoogle")}
									isDisabled={busy}
									onClick={signInWithGoogle}
								/>
							) : null}
							<Button
								variant="ghost"
								label={t(isSignUp ? "auth.switchToSignIn" : "auth.switchToSignUp")}
								isDisabled={busy}
								onClick={() => switchMode(isSignUp ? "signin" : "signup")}
							/>
						</Stack>
					</Stack>
				</Card>
			</Stack>
		</Theme>
	)
}
