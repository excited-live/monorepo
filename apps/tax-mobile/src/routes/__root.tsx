import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import '@excited-live/design-system/mastercard-theme.css'

interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
})

function RootComponent() {
	return (
		<div className="mobile-shell" data-astryx-theme="mastercard">
			<main className="mobile-main">
				<Outlet />
			</main>
		</div>
	)
}
