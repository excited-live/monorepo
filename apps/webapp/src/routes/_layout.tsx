import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Suspense } from "react"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { mastercardTheme } from "@excited-live/design-system"
import { Card } from "@astryxdesign/core/Card"
import { Stack } from "@astryxdesign/core/Stack"
import { Theme } from "@astryxdesign/core/theme"
import { Topbar } from "../components/Topbar"
import { betterAuthConfigured } from "../lib/auth-config"
import { getAuth } from "../lib/auth"

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
	component: DashboardLayout,
})

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
