import { Hono } from "hono"
import { describeRoute, openAPIRouteHandler } from "hono-openapi"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { DomainError } from "./modules/accounting/domain/errors"
import { getDb } from "./db"
import type { SqlDriver } from "./db/types"
import type { ApiEnv } from "./lib/env"
import { documentation, jsonResponse } from "./openapi/docs"
import { createAccountingRouter } from "./modules/accounting/route/accounting.routes"
import { createAgentKeysRouter } from "./routes/agent-keys"
import { createAuthRouter, createIdentityMiddleware } from "./routes/auth"
import { createMcpRouter } from "./modules/mcp/mcp.route"
import { createCatalogRouter } from "./routes/catalog"
import { createPlanRouter } from "./routes/plan"
import { createOnboardingRouter } from "./routes/onboarding"
import { createSettingsRouter } from "./routes/settings"
import { simRouter } from "./routes/sim"
import { z } from "zod"

export interface AppOptions {
	/**
	 * Pre-resolved database driver.
	 *
	 * Omitted in production: the middleware resolves the backend from the
	 * request env (D1 binding) or the local SQLite file. Tests pass one in to
	 * point the same app at a throwaway database.
	 */
	db?: SqlDriver
}

/**
 * Build the API app.
 *
 * Response shapes are unchanged from the pre-persistence version: plan and
 * settings are read through the `db` request variable, everything else
 * (routing, CORS, /health, /) is identical.
 */
export function createApp(options: AppOptions = {}): Hono<ApiEnv> {
	const app = new Hono<ApiEnv>()

	app.use("*", logger())
	app.use(
		"*",
		cors({
			origin: (origin) => origin || "*",
			allowHeaders: ["Content-Type", "Authorization", "x-user-id", "x-api-key", "Mcp-Protocol-Version", "Mcp-Session-Id"],
			exposeHeaders: ["set-auth-token"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)

	// Domain errors carry their own HTTP status (404/409/400), so they are
	// mapped here rather than in router middleware: Hono's composer catches a
	// handler's throw at that handler's own dispatch level and calls this
	// handler directly, so a `try { await next() } catch` in a router never
	// sees it.
	app.onError((err, c) => {
		if (err instanceof DomainError) {
			return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode)
		}
		console.error(err)
		return c.text("Internal Server Error", 500)
	})

	app.get(
		"/health",
		describeRoute({
			tags: ["System"],
			operationId: "getHealth",
			summary: "Health check",
			security: [],
			responses: {
				200: jsonResponse(
					"Service is up.",
					z.object({ status: z.literal("ok"), service: z.string(), timestamp: z.string() }),
				),
			},
		}),
		(c) => {
			return c.json({ status: "ok", service: "excited-live-api", timestamp: new Date().toISOString() })
		},
	)

	app.get("/", (c) => {
		return c.json({
			name: "excited.live API",
			version: "0.0.1",
			docs: "/openapi.json",
		})
	})

	// Resolve the persistence backend per request (on Workers the D1 binding is
	// only visible through the request env). Never cache the in-flight promise
	// here: getDb owns what is safe to share across requests (see its note, #158).
	const resolveDriver = (env: unknown): Promise<SqlDriver> =>
		options.db ? Promise.resolve(options.db) : getDb(env).then((resolved) => resolved.driver)

	app.use("/api/v1/*", async (c, next) => {
		c.set("db", await resolveDriver(c.env))
		await next()
	})

	app.use("/mcp", async (c, next) => {
		c.set("db", await resolveDriver(c.env))
		await next()
	})

	// Resolve identity from a Bearer session (Better Auth tokens mount); 401s
	// unauthenticated calls while auth is configured, x-user-id passthrough
	// otherwise. Runs before the routers so plan/settings see the pinned id.
	app.use("/api/v1/*", createIdentityMiddleware())

	const routes = app
		.route("/api/v1/accounting", createAccountingRouter())
		.route("/api/v1/agent-keys", createAgentKeysRouter())
		.route("/api/v1/auth", createAuthRouter())
		.route("/api/v1/catalog", createCatalogRouter())
		.route("/api/v1/plan", createPlanRouter())
		.route("/api/v1/onboarding", createOnboardingRouter())
		.route("/api/v1/settings", createSettingsRouter())
		.route("/api/v1/sim", simRouter)

	// The OpenAPI document, generated from the route annotations above. Mounted
	// outside /api/v1 so it stays public like /health.
	app.get("/openapi.json", openAPIRouteHandler(app, { documentation }))

	// The MCP server has its own auth (API keys or sessions) and is mounted
	// outside /api/v1 so the REST identity middleware does not 401 key calls.
	app.route("/", createMcpRouter())

	return routes
}

export type AppType = ReturnType<typeof createApp>


