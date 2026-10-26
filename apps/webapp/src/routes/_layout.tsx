import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Suspense } from "react"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { mastercardTheme } from "@excited-live/design-system"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { Theme } from "@astryxdesign/core/theme"
import { REQUEST_TIMEOUT_MS, isTimeoutError, startDeadline } from "@excited-live/http"
import { Topbar } from "../components/Topbar"
import { betterAuthConfigured } from "../lib/auth-config"
import { getAuth } from "../lib/auth"
import { useLocale } from "../lib/locale-context"

/** Auth state for the topbar — resolves server-side; reports configured:false without BETTER_AUTH_SECRET. */
const getAuthState = createServerFn({ method: "GET" }).handler(async () => {
	if (!betterAuthConfigured()) return { configured: false as const, user: null }
	const session = await (await getAuth()).api.getSession({ headers: getRequestHeaders() })
	const user = session?.user ?? null
	return {
		configured: true as const,
		user: user ? { firstName: user.name || null, email: user.email } : null,
	}
})

export const Route = createFileRoute("/_layout")({
	loader: async ({ location, abortController }) => {
		// The first authenticated fetch after sign-in: a client navigation runs
		// this loader in the browser, so the session RPC is raced against the
		// same 6 s budget as the sign-in POST. A stalled auth host surfaces as
		// the retry card below instead of holding the sign-in spinner forever.
		const deadline = startDeadline({ signal: abortController.signal }, REQUEST_TIMEOUT_MS)
		try {
			return {
				auth: await getAuthState({ signal: deadline.signal }),
				returnPathname: location.pathname + location.searchStr,
			}
		} finally {
			deadline.cleanup()
		}
	},
	errorComponent: SessionLoadError,
	component: DashboardLayout,
})

/**
 * Reached when the session bootstrap itself fails or expires (or a loader
 * cancels the navigation). The retry is a full reload: it re-runs the server
 * gate with a fresh connection and cookie state.
 */
function SessionLoadError({ error }: { error: unknown }) {
	const { t } = useLocale()
	const message = t(isTimeoutError(error) ? "auth.error.timeout" : "auth.error.generic")

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="signin-page">
				<Card className="signin-card">
					<Stack gap={3}>
						<Heading level={2}>{t("auth.sessionError.title")}</Heading>
						<Text color="secondary" role="alert">
							{message}
						</Text>
						<Button label={t("action.retry")} onClick={() => window.location.reload()} />
					</Stack>
				</Card>
			</Stack>
		</Theme>
	)
}

/**
 * Signed-in chrome: topbar plus the routed page.
 *
 * The plan dashboard provider and its assistant rail used to wrap every page
 * here. The plan API is gone (#65), so the layout must stay free of plan data —
 * otherwise `/settings` (and every signed-in route) fetches a route that no
 * longer exists. Plan UI lives, unrouted, in `pages/home` for the redesign.
 */
function DashboardLayout() {
	const { auth, returnPathname } = Route.useLoaderData()

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="dashboard-shell">
				<Topbar auth={auth} returnPathname={returnPathname} />

				<Stack as="main" className="dashboard-main">
					<Stack className="dashboard-content">
						<Card className="chart-panel" variant="transparent" padding={0}>
							<Suspense fallback={<Stack className="chart-panel__inner" />}>
								<Outlet />
							</Suspense>
						</Card>
					</Stack>
				</Stack>
			</Stack>
		</Theme>
	)
}
