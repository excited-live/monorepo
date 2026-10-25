import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { mcpResourceUrl } from "../../lib/auth-config"
import { LaunchHome } from "../../pages/launch-home/launch-home"

/** MCP endpoint is environment-derived, so resolve it on the server. */
const getLaunchHomeData = createServerFn({ method: "GET" }).handler(async () => ({
	mcpUrl: mcpResourceUrl(),
}))

export const Route = createFileRoute("/_layout/")({
	loader: () => getLaunchHomeData(),
	component: LaunchHomeRoute,
})

function LaunchHomeRoute() {
	const { mcpUrl } = Route.useLoaderData()
	return <LaunchHome mcpUrl={mcpUrl} />
}
