import { useState } from "react"
import { Link, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
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
import { authEnv, betterAuthConfigured } from "../lib/auth-config"
import { getAuth } from "../lib/auth"
import { useLocale } from "../lib/locale-context"

/**
 * Device authorization page (A2.2, RFC 8628).
 *
 * Cloud/headless agents create a code and send the user the
 * `verification_uri_complete` link, which lands here with `?user_code=…`.
 * Signing in is required to approve (the guard bounces signed-out page
 * requests to /sign-in and returns here through `returnPathname`); the GET
 * below also claims the code for the signed-in user, which is what the
 * provider requires before `/device/approve` or `/device/deny`.
 */
interface DeviceSearch {
	user_code?: string
}

const getDeviceContext = createServerFn({ method: "GET" })
	.validator((data: { userCode?: string }) => data)
	.handler(async ({ data }) => {
		if (!betterAuthConfigured()) {
			return {
				configured: false as const,
				signedIn: false,
				request: null,
				error: null,
			}
		}
		const auth = await getAuth()
		const headers = getRequestHeaders()
		const session = await auth.api.getSession({ headers })
		const signedIn = Boolean(session?.user)
		if (!data.userCode) {
			return { configured: true as const, signedIn, request: null, error: null }
		}
		try {
			const url = new URL("/api/auth/device", authEnv("BETTER_AUTH_URL") ?? "http://localhost")
			url.searchParams.set("user_code", data.userCode)
			const response = await auth.handler(new Request(url, { headers }))
			const body = (await response.json()) as {
				user_code?: string
				status?: string
				client_id?: string
				scope?: string
				error_description?: string
			}
			if (!response.ok) {
				return {
					configured: true as const,
					signedIn,
					request: null,
					error: body.error_description ?? "invalid_request",
				}
			}
			return {
				configured: true as const,
				signedIn,
				request: {
					userCode: body.user_code ?? data.userCode,
					status: body.status ?? "pending",
					clientId: body.client_id ?? null,
					scope: body.scope ?? null,
				},
				error: null,
			}
		} catch {
			return { configured: true as const, signedIn, request: null, error: "invalid_request" }
		}
	})

export const Route = createFileRoute("/device")({
	validateSearch: (search: Record<string, unknown>): DeviceSearch => ({
		user_code: typeof search.user_code === "string" ? search.user_code : undefined,
	}),
	loaderDeps: ({ search }) => ({ userCode: search.user_code }),
	loader: async ({ deps }) => getDeviceContext({ data: { userCode: deps.userCode } }),
	component: DevicePage,
})

type DecideState = "idle" | "approving" | "denying" | "approved" | "denied"

function DevicePage() {
	const { t } = useLocale()
	const navigate = useNavigate()
	const location = useLocation()
	const { configured, signedIn, request, error } = Route.useLoaderData()
	const { user_code } = Route.useSearch()

	const [code, setCode] = useState(user_code ?? "")
	const [state, setState] = useState<DecideState>("idle")
	const [failure, setFailure] = useState(false)

	const decide = async (accept: boolean) => {
		setState(accept ? "approving" : "denying")
		setFailure(false)
		try {
			const response = await fetch(`/api/auth/device/${accept ? "approve" : "deny"}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ userCode: request?.userCode ?? user_code }),
			})
			if (!response.ok) {
				setFailure(true)
				setState("idle")
				return
			}
			setState(accept ? "approved" : "denied")
		} catch {
			setFailure(true)
			setState("idle")
		}
	}

	const busy = state === "approving" || state === "denying"
	const returnPathname = `${location.pathname}${location.searchStr}`

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="signin-page">
				<Card className="signin-card">
					<Stack gap={3}>
						<Heading level={2}>{t("auth.device.title")}</Heading>
						{!configured ? <Text color="secondary">{t("auth.notConfigured")}</Text> : null}

						{configured && state === "approved" ? (
							<Text>{t("auth.device.success")}</Text>
						) : null}
						{configured && state === "denied" ? (
							<Text>{t("auth.device.denied")}</Text>
						) : null}

						{configured && state !== "approved" && state !== "denied" ? (
							<>
								<Text color="secondary">{t("auth.device.subtitle")}</Text>
								<TextInput
									label={t("auth.device.codeLabel")}
									value={code}
									onChange={setCode}
								/>
								<Button
									variant="secondary"
									label={t("auth.device.continue")}
									isDisabled={!code.trim()}
									onClick={() =>
										navigate({ to: "/device", search: { user_code: code.trim() } })
									}
								/>

								{!signedIn ? (
									<Stack gap={2}>
										<Text size="sm" color="secondary">
											{t("auth.device.signInRequired")}
										</Text>
										<Link
											to="/sign-in"
											search={{ returnPathname }}
											className="auth-link"
										>
											{t("auth.signIn")}
										</Link>
									</Stack>
								) : null}

								{error ? (
									<Text size="sm" className="signin-error" role="alert">
										{t("auth.device.invalidCode")}
									</Text>
								) : null}

								{signedIn && request ? (
									<Stack gap={2}>
										<Text size="sm" color="secondary">
											{t("auth.device.client", {
												client: request.clientId ?? t("auth.device.unknownClient"),
											})}
										</Text>
										{request.status !== "pending" ? (
											<Text size="sm" color="secondary">
												{t("auth.device.alreadyProcessed")}
											</Text>
										) : (
											<Stack gap={2}>
												<Button
													label={t("auth.device.approve")}
													isDisabled={busy}
													onClick={() => decide(true)}
												/>
												<Button
													variant="secondary"
													label={t("auth.device.deny")}
													isDisabled={busy}
													onClick={() => decide(false)}
												/>
											</Stack>
										)}
									</Stack>
								) : null}

								{failure ? (
									<Text size="sm" className="signin-error" role="alert">
										{t("auth.device.genericError")}
									</Text>
								) : null}
							</>
						) : null}
					</Stack>
				</Card>
			</Stack>
		</Theme>
	)
}
