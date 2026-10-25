import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LocaleProvider } from "./locale-context"
import { LaunchHome } from "../pages/launch-home/launch-home"

/**
 * #65 guard: the webapp must never call the decommissioned `/api/v1/plan` or
 * `/api/v1/sim/*` routes again, and the signed-in layout must not mount the
 * plan provider. QA saw these fire on `/` and `/settings` on prod.
 */

const read = (relative: string) =>
	readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")

describe("removed plan API routes stay removed", () => {
	it("the generated route tree exposes neither /api/v1/plan nor /api/v1/sim/*", () => {
		const routeTree = read("../routeTree.gen.ts")

		expect(routeTree).not.toMatch(/['"]\/api\/v1\/plan['"]/)
		expect(routeTree).not.toMatch(/['"]\/api\/v1\/sim\//)
		expect(routeTree).not.toMatch(/routes\/api\/v1\/plan/)
		expect(routeTree).not.toMatch(/routes\/api\/v1\/sim/)
	})

	it("the signed-in layout mounts no plan provider, rail, or fetch", () => {
		const layout = read("../routes/_layout.tsx")

		expect(layout).not.toMatch(/PlanDashboardProvider/)
		expect(layout).not.toMatch(/usePlanDashboard/)
		expect(layout).not.toMatch(/plan-service/)
		expect(layout).not.toMatch(/AssistantRail/)
		expect(layout).not.toMatch(/plan-column/)
		expect(layout).not.toMatch(/\bfetch\(/)
	})

	it("`/` renders the launch home, not the plan dashboard", () => {
		const index = read("../routes/_layout/index.tsx")

		expect(index).toMatch(/pages\/launch-home\/launch-home/)
		expect(index).not.toMatch(/pages\/home\/home/)
		expect(index).not.toMatch(/plan-service|usePlanDashboard/)
	})
})

describe("launch home renders without requesting removed endpoints", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("renders the agent connection and empty state, and makes no fetch", () => {
		const fetchSpy = vi.fn()
		vi.stubGlobal("fetch", fetchSpy)

		const html = renderToStaticMarkup(
			createElement(LocaleProvider, {
				initialLocale: "en",
				children: createElement(LaunchHome, { mcpUrl: "https://api.excited.live/mcp" }),
			}),
		)

		expect(html).toContain("Connect your agent")
		expect(html).toContain("https://api.excited.live/mcp")
		expect(html).toContain("being redesigned")
		expect(html).not.toContain("Unable to load plan")
		expect(html).not.toContain("Failed to load this section")
		expect(fetchSpy).not.toHaveBeenCalled()
	})
})
