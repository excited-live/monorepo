import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { SqlDriver } from "../../db/types";
import type { AccountingService } from "../accounting/service/accounting.service";
import type { OnboardingStore } from "../../stores/onboarding-store";
import { DomainError, DuplicateError } from "../accounting/domain/errors";
import type { McpPrincipal } from "./mcp.auth";
import { ONBOARDING_INSTRUCTIONS, ONBOARDING_PROMPT } from "./instructions";
import { onboardingTools } from "./tools/onboarding.tools";
import { accountingTools } from "./tools/accounting.tools";

/**
 * The MCP tool registry.
 *
 * A tool is a small declaration: name, title, description, a zod input schema
 * (the same shapes the REST routes use), the scope it needs, and a handler that
 * talks to the in-process services. New suites are new files appended to
 * `ALL_TOOLS`; the server wiring below stays the same.
 */

export interface McpToolContext {
	userId: string;
	db: SqlDriver;
	accounting: AccountingService;
	onboarding: OnboardingStore;
}

export interface McpToolDefinition {
	name: string;
	title: string;
	description: string;
	inputSchema: z.ZodType<Record<string, unknown>>;
	/** Permission required to call the tool, e.g. `accounting:write`. */
	requiredScope: string;
	handler(ctx: McpToolContext, input: Record<string, unknown>): Promise<unknown>;
}

export const ALL_TOOLS: readonly McpToolDefinition[] = [...onboardingTools, ...accountingTools];

/**
 * What the credential behind this request actually is (#161).
 *
 * Not on `GET /mcp` (an SSE stream that holds 0 bytes, #142) and not in
 * `initialize` (which a client caches once), so the only per-credential answer
 * is a tool. `scopes` are the tool scopes enforced here, not the request tokens:
 * the question it answers is "can I call `add_expense` before I try?".
 */
function registerWhoami(server: McpServer, principal: McpPrincipal, ctx: McpToolContext): void {
	server.registerTool(
		"whoami",
		{
			title: "Who am I",
			description:
				"The user and credential serving this request, and the scopes it can use. Call it before a write to check least privilege.",
			inputSchema: z.object({}),
		},
		async (): Promise<CallToolResult> =>
			successResult({
				userId: ctx.userId,
				via: principal.via,
				scopes: [...principal.scopes].sort(),
			}),
	);
}

function toolError(message: string): CallToolResult {
	return { content: [{ type: "text", text: message }], isError: true };
}

/** Domain errors become MCP tool errors with their message; anything else is logged and generic. */
function errorResult(error: unknown): CallToolResult {
	if (error instanceof DomainError) return toolError(error.message);
	console.error("[mcp] tool failed", error);
	return toolError("Internal error while running the tool");
}

function successResult(result: unknown): CallToolResult {
	return {
		content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
		structuredContent: result as Record<string, unknown>,
	};
}

/**
 * Run a create and treat a retry with the caller's own id as success (#143).
 *
 * Create bodies accept an optional client-generated `id`. If a write lands but
 * its response is lost, retrying with the same id hits the primary key and used
 * to surface as the tool error "A record with this id already exists". For an
 * unattended agent that is the worst case: retry risks a duplicate, stop leaves
 * the write unconfirmed. Instead return the stored record with
 * `deduplicated: true`, so the retry is provably a no-op.
 *
 * Only a duplicate of the id the caller supplied is treated as a replay. A
 * conflict without a client id, or a read that cannot find the record, still
 * fails as before.
 */
export async function createOrReuse<T>(step: {
	id?: string;
	key: string;
	create: () => Promise<T>;
	read: (id: string) => Promise<T>;
}): Promise<Record<string, unknown>> {
	try {
		return { [step.key]: await step.create() };
	} catch (error) {
		if (!(error instanceof DuplicateError) || !step.id) throw error;
		let stored: T;
		try {
			stored = await step.read(step.id);
		} catch {
			throw error;
		}
		return { [step.key]: stored, deduplicated: true };
	}
}

/** A fresh MCP server for one request, with the onboarding tool suite registered. */
export function createMcpServer(principal: McpPrincipal, ctx: McpToolContext): McpServer {
	const server = new McpServer(
		{ name: "excited-live", version: "0.1.0" },
		{ instructions: ONBOARDING_INSTRUCTIONS },
	);

	registerWhoami(server, principal, ctx);

	for (const tool of ALL_TOOLS) {
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema,
			},
			async (input): Promise<CallToolResult> => {
				if (!principal.scopes.has(tool.requiredScope)) {
					return toolError(
						`This API key is missing the \`${tool.requiredScope}\` scope needed for \`${tool.name}\`.`,
					);
				}
				try {
					return successResult(await tool.handler(ctx, input as Record<string, unknown>));
				} catch (error) {
					return errorResult(error);
				}
			},
		);
	}

	server.registerPrompt(
		ONBOARDING_PROMPT.name,
		{ title: ONBOARDING_PROMPT.title, description: ONBOARDING_PROMPT.description },
		() => ({
			description: ONBOARDING_PROMPT.description,
			messages: [
				{
					role: "user",
					content: { type: "text", text: ONBOARDING_INSTRUCTIONS },
				},
			],
		}),
	);

	return server;
}
