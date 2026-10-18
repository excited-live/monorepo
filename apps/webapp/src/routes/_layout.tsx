import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Suspense } from "react"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { PlainButton, mastercardTheme } from "@excited-live/design-system"
import { Card } from "@astryxdesign/core/Card"
import { Grid } from "@astryxdesign/core/Grid"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { Theme } from "@astryxdesign/core/theme"
import { AssistantRail } from "../components/AssistantRail"
import { Topbar } from "../components/Topbar"
import { betterAuthConfigured } from "../lib/auth-config"
import { getAuth } from "../lib/auth"
import {
	PlanDashboardProvider,
	usePlanDashboardContext,
} from "../hooks/usePlanDashboard"

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
	loader: async ({ location }) => ({
		auth: await getAuthState(),
		returnPathname: location.pathname + location.searchStr,
	}),
	component: DashboardLayoutWrapper,
})

function DashboardLayoutWrapper() {
	return (
		<PlanDashboardProvider>
			<DashboardLayout />
		</PlanDashboardProvider>
	)
}

function DashboardLayout() {
	const { t, summary, status, reload } = usePlanDashboardContext()
	const { auth, returnPathname } = Route.useLoaderData()

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="dashboard-shell">
				<Topbar auth={auth} returnPathname={returnPathname} />

				<Stack as="main" className="dashboard-main">
					<Grid className="dashboard-grid">
						<Card className="chart-panel" variant="transparent" padding={0}>
							<Suspense fallback={<Stack className="chart-panel__inner" />}>
								<Outlet />
							</Suspense>
						</Card>

						<Stack
							as="section"
							className="plan-column"
							aria-label={t("rail.title")}
						>
							{status === "loading" ? (
								<Stack className="plan-column__chat" vAlign="center" hAlign="center" padding={4}>
									<Text color="secondary">{t("plan.lastSyncedToday")}</Text>
								</Stack>
							) : summary.ok ? (
								<Stack className="plan-column__chat">
									<AssistantRail summary={summary.data} t={t} />
								</Stack>
							) : (
								<Stack className="plan-column__chat" vAlign="center" hAlign="center" padding={4} gap={2}>
									<Text color="secondary">{t("component.error.generic")}</Text>
									<PlainButton onClick={reload}>
										<Text size="sm">{t("action.retry")}</Text>
									</PlainButton>
								</Stack>
							)}
						</Stack>
					</Grid>
				</Stack>
			</Stack>
		</Theme>
	)
}
