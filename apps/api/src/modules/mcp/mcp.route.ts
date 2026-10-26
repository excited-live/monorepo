import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono, type Context } from "hono";
import type { ApiEnv } from "../../lib/env";
import { tokensAuthConfigured } from "../../lib/auth";
import { protectedResourceMetadata } from "../../lib/oauth";
import { createOnboardingStore } from "../../stores/onboarding-store";
import { createSqlAccountingRepository } from "../accounting/repository/sql-accounting.repository";
import { createAccountingService } from "../accounting/service/accounting.service";
import { rateLimitHeaders, rateLimitedResponse, resolvePrincipal, unauthorizedResponse } from "./mcp.auth";
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

	// RFC 9728 protected-resource discovery (the URL the 401 challenge points
	// at). Both the bare well-known path and the `/mcp` suffix are published:
	// clients derive one or the other from the resource URL.
	const serveProtectedResourceMetadata = (c: Context<ApiEnv>) => {
		const metadata = tokensAuthConfigured() ? protectedResourceMetadata(c.req.url) : null;
		if (!metadata) {
			return c.json({ error: "oauth is not configured in this environment" }, 404);
		}
		c.header("cache-control", "no-store");
		return c.json(metadata);
	};
	router.get("/.well-known/oauth-protected-resource", serveProtectedResourceMetadata);
	router.get("/.well-known/oauth-protected-resource/mcp", serveProtectedResourceMetadata);

	router.all("/mcp", async (c) => {
		const resolved = await resolvePrincipal(c);
		if (resolved.status === "unauthenticated") return unauthorizedResponse(c.req.url);
		if (resolved.status === "rate_limited") {
			return rateLimitedResponse(resolved.rateLimit, resolved.retryAfterSeconds);
		}
		const principal = resolved.principal;

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
		const response = await transport.handleRequest(c.req.raw);
		// The key's remaining budget rides the 200s too, so an agent can back
		// off before it is refused (#140).
		if (resolved.rateLimit) {
			for (const [name, value] of Object.entries(rateLimitHeaders(resolved.rateLimit))) {
				response.headers.set(name, value);
			}
		}
		return response;
	});

	return router;
}
