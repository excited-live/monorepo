import { useState } from "react"
import { Link, createFileRoute, useLocation } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { mastercardTheme } from "@excited-live/design-system"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { Theme } from "@astryxdesign/core/theme"
import { authEnv, betterAuthConfigured } from "../lib/auth-config"
import { getAuth } from "../lib/auth"
import { useLocale } from "../lib/locale-context"

/**
 * OAuth consent page (A2.2). The webapp authorization server redirects here
 * with a signed authorization query; the user sees the client name and the
 * requested scopes in plain language, then Allow/Deny.
 *
 * Reached signed out only when AUTH_REQUIRED is off (previews/local): the page
 * asks the user to sign in and preserves the flow through `returnPathname`.
 */
interface ConsentSearch {
	client_id?: string
	scope?: string
}

/** Fetch the public client fields for this request (session required by the provider). */
const getConsentContext = createServerFn({ method: "GET" })
	.validator((data: { clientId?: string }) => data)
	.handler(async ({ data }) => {
		if (!betterAuthConfigured()) {
			return { configured: false as const, signedIn: false, clientName: null }
		}
		const auth = await getAuth()
		const headers = getRequestHeaders()
		const session = await auth.api.getSession({ headers })
		if (!data.clientId || !session?.user) {
			return { configured: true as const, signedIn: Boolean(session?.user), clientName: null }
		}
		try {
			const url = new URL("/api/auth/oauth2/public-client", authEnv("BETTER_AUTH_URL") ?? "http://localhost")
			url.searchParams.set("client_id", data.clientId)
			const response = await auth.handler(new Request(url, { headers }))
			if (!response.ok) {
				return { configured: true as const, signedIn: true, clientName: null }
			}
			const body = (await response.json()) as { client_id: string; client_name?: string }
			return { configured: true as const, signedIn: true, clientName: body.client_name || body.client_id }
		} catch {
			return { configured: true as const, signedIn: true, clientName: null }
		}
	})

export const Route = createFileRoute("/consent")({
	validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
		client_id: typeof search.client_id === "string" ? search.client_id : undefined,
		scope: typeof search.scope === "string" ? search.scope : undefined,
	}),
	loaderDeps: ({ search }) => ({ clientId: search.client_id }),
	loader: async ({ deps }) => getConsentContext({ data: { clientId: deps.clientId } }),
	component: ConsentPage,
})

/** Supported scopes → dictionary keys in plain language (unknown scopes are hidden). */
const SCOPE_KEYS: Record<string, string> = {
	onboarding: "auth.scope.onboarding",
	"accounting:read": "auth.scope.accountingRead",
	"accounting:write": "auth.scope.accountingWrite",
}

function ConsentPage() {
	const { t } = useLocale()
	const location = useLocation()
	const { clientName, configured, signedIn } = Route.useLoaderData()
	const { scope } = Route.useSearch()

	const [busy, setBusy] = useState(false)
	const [error, setError] = useState(false)

	const scopes = Array.from(new Set((scope ?? "").split(/\s+/).filter((value) => value in SCOPE_KEYS)))
	const returnPathname = `${location.pathname}${location.searchStr}`

	const decide = async (accept: boolean) => {
		setBusy(true)
		setError(false)
		try {
			const response = await fetch("/api/auth/oauth2/consent", {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					accept,
					// The provider signs this query; forward it verbatim.
					oauth_query: window.location.search.replace(/^\?/, ""),
				}),
			})
			const body = (await response.json()) as { url?: string }
			if (!response.ok || !body.url) {
				setError(true)
				return
			}
			window.location.assign(body.url)
		} catch {
			setError(true)
		} finally {
			setBusy(false)
		}
	}

	if (!configured) {
		return (
			<Theme theme={mastercardTheme} mode="light">
				<Stack className="signin-page">
					<Card className="signin-card">
						<Stack gap={2}>
							<Heading level={2}>{t("auth.consent.title")}</Heading>
							<Text color="secondary">{t("auth.notConfigured")}</Text>
						</Stack>
					</Card>
				</Stack>
			</Theme>
		)
	}

	if (!signedIn) {
		return (
			<Theme theme={mastercardTheme} mode="light">
				<Stack className="signin-page">
					<Card className="signin-card">
						<Stack gap={3}>
							<Heading level={2}>{t("auth.consent.title")}</Heading>
							<Text color="secondary">{t("auth.consent.signInRequired")}</Text>
							<Link
								to="/sign-in"
								search={{ returnPathname }}
								className="auth-link"
							>
								{t("auth.signIn")}
							</Link>
						</Stack>
					</Card>
				</Stack>
			</Theme>
		)
	}

	if (!clientName) {
		return (
			<Theme theme={mastercardTheme} mode="light">
				<Stack className="signin-page">
					<Card className="signin-card">
						<Stack gap={2}>
							<Heading level={2}>{t("auth.consent.title")}</Heading>
							<Text color="secondary">{t("auth.consent.unknownClient")}</Text>
						</Stack>
					</Card>
				</Stack>
			</Theme>
		)
	}

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="signin-page">
				<Card className="signin-card">
					<Stack gap={3}>
						<Stack gap={1}>
							<Heading level={2}>{t("auth.consent.title")}</Heading>
							<Text color="secondary">
								{t("auth.consent.subtitle", { client: clientName })}
							</Text>
						</Stack>
						<Stack gap={2} className="auth-scope-list">
							<Text weight="medium">{t("auth.consent.scopesHeading")}</Text>
							{scopes.map((value) => {
								const key = SCOPE_KEYS[value]
								return key ? (
									<Text key={value} size="sm">
										{t(key)}
									</Text>
								) : null
							})}
						</Stack>
						{error ? (
							<Text size="sm" className="signin-error" role="alert">
								{t("auth.consent.error")}
							</Text>
						) : null}
						<Stack gap={2}>
							<Button
								label={t("auth.consent.allow")}
								isDisabled={busy}
								onClick={() => decide(true)}
							/>
							<Button
								variant="secondary"
								label={t("auth.consent.deny")}
								isDisabled={busy}
								onClick={() => decide(false)}
							/>
						</Stack>
					</Stack>
				</Card>
			</Stack>
		</Theme>
	)
}
