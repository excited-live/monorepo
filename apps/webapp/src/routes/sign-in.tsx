import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
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
import { useLocale } from "../lib/locale-context"

/**
 * Sign-in page (Better Auth). Replaces the hosted AuthKit page from the WorkOS
 * integration. Reachable signed out (the guard exempts /sign-in); renders a
 * clear notice when auth is not configured in this environment (previews,
 * local mock work).
 */
const getSignInConfig = createServerFn({ method: "GET" }).handler(async () => {
	if (!betterAuthConfigured()) return { configured: false as const, googleEnabled: false }
	return { configured: true as const, googleEnabled: Boolean(googleProviderConfig()) }
})

/** Only same-origin, absolute paths are safe redirect targets. */
function sanitizeReturnPath(value: string | undefined): string {
	return value && value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

interface SignInSearch {
	returnPathname?: string
}

export const Route = createFileRoute("/sign-in")({
	validateSearch: (search: Record<string, unknown>): SignInSearch => ({
		returnPathname: typeof search.returnPathname === "string" ? search.returnPathname : undefined,
	}),
	loader: async () => getSignInConfig(),
	component: SignInPage,
})

function SignInPage() {
	const { t } = useLocale()
	const navigate = useNavigate()
	const { configured, googleEnabled } = Route.useLoaderData()
	const { returnPathname } = Route.useSearch()

	const authClient = createAuthClient()

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const target = sanitizeReturnPath(returnPathname)

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
			await navigate({ to: target })
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
			await authClient.signIn.social({ provider: "google", callbackURL: target })
		} catch {
			setError(t("auth.error.generic"))
			setBusy(false)
		}
	}

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="signin-page">
				<Card className="signin-card">
					<Stack as="form" onSubmit={signInWithEmail} gap={3}>
						<Stack gap={1}>
							<Heading level={2}>{t("auth.signInTitle")}</Heading>
							<Text color="secondary">{t("auth.signInSubtitle")}</Text>
						</Stack>
						<TextInput
							label={t("auth.email")}
							type="email"
							value={email}
							onChange={setEmail}
							isRequired
						/>
						<TextInput
							label={t("auth.password")}
							type="password"
							value={password}
							onChange={setPassword}
							isRequired
						/>
						{error ? (
							<Text size="sm" className="signin-error" role="alert">
								{error}
							</Text>
						) : null}
						<Stack gap={2}>
							<Button type="submit" label={t("auth.signIn")} isDisabled={busy} />
							{googleEnabled ? (
								<Button
									variant="secondary"
									label={t("auth.continueWithGoogle")}
									isDisabled={busy}
									onClick={signInWithGoogle}
								/>
							) : null}
						</Stack>
					</Stack>
				</Card>
			</Stack>
		</Theme>
	)
}
