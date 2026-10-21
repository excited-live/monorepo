import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import type { ApiEnv } from "../../lib/env";
import { createOnboardingStore } from "../../stores/onboarding-store";
import { createSqlAccountingRepository } from "../accounting/repository/sql-accounting.repository";
import { createAccountingService } from "../accounting/service/accounting.service";
import { resolvePrincipal, unauthorizedResponse } from "./mcp.auth";
import { createMcpServer } from "./registry";

/**
 * The MCP endpoint (`/mcp`), mounted outside `/api/v1` because it has its own
 * auth (API keys in addition to sessions) and speaks Streamable HTTP.
 *
 * Stateless: one server and one transport per request, JSON responses. The
 * transport is the Web Standards one, so it runs unchanged on Node and Workers.
 */
export function createMcpRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	router.all("/mcp", async (c) => {
		const principal = await resolvePrincipal(c);
		if (!principal) return unauthorizedResponse(c.req.url);

		const db = c.get("db");
		const server = createMcpServer(principal, {
			userId: principal.userId,
			db,
			accounting: createAccountingService(createSqlAccountingRepository(db)),
			onboarding: createOnboardingStore(db),
		});
		const transport = new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});

		await server.connect(transport);
		return transport.handleRequest(c.req.raw);
	});

	return router;
}
