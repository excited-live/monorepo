import type { ReactNode } from "react"
import { useMemo } from "react"
import { Theme, mastercardTheme } from "@excited-live/design-system"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router"
import type { Locale } from "@excited-live/i18n"
import { LocaleProvider } from "../lib/locale-context"
import { PlanDashboardProvider } from "../hooks/usePlanDashboard"

export interface TestScaffoldProps {
	children: ReactNode
	locale?: Locale
	initialPath?: string
	/** Wrap children in PlanDashboardProvider for components that consume it. */
	withPlanDashboard?: boolean
}

export function TestScaffold({
	children,
	locale = "en",
	initialPath = "/",
	withPlanDashboard = false,
}: TestScaffoldProps) {
	const router = useMemo(() => {
		const rootRoute = createRootRoute({
			component: () => <>{children}</>,
		})
		const memoryHistory = createMemoryHistory({
			initialEntries: [initialPath],
		})
		return createRouter({
			routeTree: rootRoute,
			history: memoryHistory,
		})
	}, [children, initialPath])

	return (
		<Theme theme={mastercardTheme} mode="light">
			<LocaleProvider initialLocale={locale}>
				{withPlanDashboard ? (
					<PlanDashboardProvider>{children}</PlanDashboardProvider>
				) : (
					<RouterProvider router={router} />
				)}
			</LocaleProvider>
		</Theme>
	)
}
