import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import type { AuthMode } from "@excited-live/auth/flow"
import { Shell } from "./components/Shell"
import { DataPage } from "./routes/data"
import { OverviewPage } from "./routes/overview"
import { SignInPage } from "./routes/sign-in"
import { TokensPage } from "./routes/tokens"
import "./styles/global.css"

/**
 * The whole app: one client-side router, no server entry.
 *
 * Routes are code-based (there is no file-route plugin) so the tree is explicit
 * and typed: every `<Link to=…>` is checked against it. Cloudflare Pages serves
 * `dist/` with the SPA fallback declared in wrangler.toml, so a deep link like
 * `/data?endpoint=…` survives a reload.
 */
const rootRoute = createRootRoute({
	component: Shell,
	notFoundComponent: NotFound,
})

const overviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: OverviewPage,
})

const dataRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/data",
	validateSearch: (search: Record<string, unknown>): { endpoint?: string } => ({
		endpoint: typeof search.endpoint === "string" ? search.endpoint : undefined,
	}),
	component: DataPage,
})

const signInRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/sign-in",
	validateSearch: (search: Record<string, unknown>): { mode?: AuthMode; returnPathname?: string } => ({
		mode: search.mode === "signup" ? ("signup" as const) : undefined,
		returnPathname: typeof search.returnPathname === "string" ? search.returnPathname : undefined,
	}),
	component: SignInPage,
})

const tokensRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tokens",
	component: TokensPage,
})

const routeTree = rootRoute.addChildren([overviewRoute, dataRoute, signInRoute, tokensRoute])

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

function NotFound() {
	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">404</span>
					<h1>No such page</h1>
					<p className="lede">
						The hub has three tabs: Overview, Data and API keys. Start from the overview.
					</p>
				</div>
			</div>
		</div>
	)
}

const container = document.getElementById("root")
if (!container) throw new Error("index.html is missing #root")

createRoot(container).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
