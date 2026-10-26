import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Link, RouterProvider } from "@tanstack/react-router"
import type { AuthMode } from "@excited-live/auth/flow"
import { Shell } from "./components/Shell"
import { useTranslator } from "./lib/i18n"
import { HomePage } from "./routes/home"
// The Theme wrapper only sets the attribute; the token values themselves come
// from this stylesheet (the same one apps/webapp imports in __root.tsx).
import "@excited-live/design-system/mastercard-theme.css"
import "./styles/global.css"

/**
 * The whole app: one client-side router, no server entry.
 *
 * Routes are code-based (there is no file-route plugin) so the tree is explicit
 * and typed: every `<Link to=…>` is checked against it. Cloudflare Pages serves
 * `dist/` with the SPA fallback declared in `public/_redirects`, so a deep link
 * like `/mcp` or `/data?endpoint=…` survives a hard refresh.
 *
 * #91 split the old overview in two: `/` is the marketing Home and `/mcp` is
 * the agent console. `/tokens` and `/data` keep their URLs.
 */
const rootRoute = createRootRoute({
	component: Shell,
	notFoundComponent: NotFound,
})

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
})

const mcpRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/mcp",
	component: lazyRouteComponent(() => import("./routes/mcp"), "McpAgentsPage"),
})

const dataRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/data",
	validateSearch: (search: Record<string, unknown>): { endpoint?: string } => ({
		endpoint: typeof search.endpoint === "string" ? search.endpoint : undefined,
	}),
	component: lazyRouteComponent(() => import("./routes/data"), "DataPage"),
})

const signInRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/sign-in",
	validateSearch: (search: Record<string, unknown>): { mode?: AuthMode; returnPathname?: string } => ({
		mode: search.mode === "signup" ? ("signup" as const) : undefined,
		returnPathname: typeof search.returnPathname === "string" ? search.returnPathname : undefined,
	}),
	component: lazyRouteComponent(() => import("./routes/sign-in"), "SignInPage"),
})

const tokensRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tokens",
	component: lazyRouteComponent(() => import("./routes/tokens"), "TokensPage"),
})

const routeTree = rootRoute.addChildren([homeRoute, mcpRoute, dataRoute, signInRoute, tokensRoute])

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
	const { t } = useTranslator()
	return (
		<div className="page">
			<div className="page-head">
				<div>
					<span className="eyebrow">404</span>
					<h1>{t("notfound.title")}</h1>
					<p className="lede">{t("notfound.body")}</p>
					<Link to="/" className="btn signal" style={{ marginTop: 16 }}>
						{t("nav.home")}
					</Link>
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
