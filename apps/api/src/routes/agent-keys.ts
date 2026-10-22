import { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../lib/env";
import { apiKeyApi } from "@excited-live/auth";
import { getTokensAuth } from "../lib/auth";
import { getUserId } from "../lib/request";
import { jsonBody, jsonResponse, route } from "../openapi/docs";
import { ErrorSchema, OkSchema } from "../openapi/schemas";

/**
 * Server-minted agent API keys (`/api/v1/agent-keys`).
 *
 * Keys are created HERE, never by the client calling Better Auth directly:
 * the permissions below are fixed server-side, so an agent key can only ever
 * touch onboarding and accounting. The identity middleware runs first, which
 * means an API key itself can never mint another key.
 */

/** 90 days, in seconds (Better Auth's `expiresIn` unit). */
const KEY_TTL_SECONDS = 90 * 24 * 60 * 60;

/** Onboarding keys may read and write the onboarding state and the books. */
const AGENT_KEY_PERMISSIONS = {
	onboarding: ["read", "write"],
	accounting: ["read", "write"],
} as const;

const CreateAgentKeyBody = z.object({
	agentId: z.string().min(1, "agentId is required"),
	name: z.string().min(1).optional(),
});

const AgentKeySchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	start: z.string().nullable(),
	agentId: z.string().nullable(),
	createdAt: z.string(),
	expiresAt: z.string().nullable(),
	lastRequest: z.string().nullable(),
});

const CreatedAgentKeySchema = z.object({
	id: z.string(),
	key: z.string().describe("The full key. Returned only on creation."),
	name: z.string().nullable(),
	start: z.string().nullable(),
	expiresAt: z.string().nullable(),
});

type ApiKeyLike = {
	id: string;
	name?: string | null;
	start?: string | null;
	createdAt?: Date | string;
	expiresAt?: Date | string | null;
	lastRequest?: Date | string | null;
	metadata?: Record<string, unknown> | null;
};

function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	return value instanceof Date ? value.toISOString() : value;
}

function keyView(key: ApiKeyLike) {
	const agentId = key.metadata?.agentId;
	return {
		id: key.id,
		name: key.name ?? null,
		start: key.start ?? null,
		agentId: typeof agentId === "string" ? agentId : null,
		createdAt: iso(key.createdAt) ?? new Date(0).toISOString(),
		expiresAt: iso(key.expiresAt),
		lastRequest: iso(key.lastRequest),
	};
}

/** Maps a Better Auth APIError to the closest HTTP status without importing better-auth. */
function errorStatus(error: unknown): 401 | 404 | 400 {
	const status = (error as { statusCode?: number } | null)?.statusCode;
	if (status === 401) return 401;
	if (status === 404) return 404;
	return 400;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Request failed";
}

export function createAgentKeysRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	router.post(
		"/",
		route({
			tags: ["Auth"],
			operationId: "createAgentKey",
			summary: "Mint an agent API key",
			description:
				"Creates a 90-day key scoped to onboarding and accounting, owned by the signed-in user. The full key is returned once.",
			requestBody: jsonBody(CreateAgentKeyBody),
			responses: {
				201: jsonResponse("The new key. The `key` field is shown only here.", CreatedAgentKeySchema),
				400: jsonResponse("Malformed request.", ErrorSchema),
				401: jsonResponse("Not signed in.", ErrorSchema),
				503: jsonResponse("Auth is not configured in this environment.", ErrorSchema),
			},
		}),
		async (c) => {
			const auth = await getTokensAuth(c.req.url, c.env);
			if (!auth) return c.json({ error: "auth not configured in this environment" }, 503);

			const parsed = CreateAgentKeyBody.safeParse(await c.req.json().catch(() => null));
			if (!parsed.success) return c.json({ error: "Malformed agent key payload" }, 400);

			const userId = getUserId(c);
			try {
				const created = await apiKeyApi(auth).createApiKey({
					body: {
						userId,
						name: parsed.data.name ?? `${parsed.data.agentId} agent`,
						expiresIn: KEY_TTL_SECONDS,
						permissions: AGENT_KEY_PERMISSIONS as unknown as Record<string, string[]>,
						metadata: { purpose: "agent", agentId: parsed.data.agentId },
					},
				});
				return c.json(
					{
						id: created.id,
						key: created.key,
						name: created.name ?? null,
						start: created.start ?? null,
						expiresAt: iso(created.expiresAt),
					},
					201,
				);
			} catch (error) {
				return c.json({ error: errorMessage(error) }, errorStatus(error));
			}
		},
	);

	router.get(
		"/",
		route({
			tags: ["Auth"],
			operationId: "listAgentKeys",
			summary: "List agent API keys",
			description: "Keys owned by the signed-in user. The secret is never returned.",
			responses: {
				200: jsonResponse("The user's keys.", z.object({ keys: z.array(AgentKeySchema) })),
				401: jsonResponse("Not signed in.", ErrorSchema),
				503: jsonResponse("Auth is not configured in this environment.", ErrorSchema),
			},
		}),
		async (c) => {
			const auth = await getTokensAuth(c.req.url, c.env);
			if (!auth) return c.json({ error: "auth not configured in this environment" }, 503);

			try {
				const { apiKeys } = await apiKeyApi(auth).listApiKeys({ headers: c.req.raw.headers });
				return c.json({ keys: (apiKeys as ApiKeyLike[]).map(keyView) });
			} catch (error) {
				return c.json({ error: errorMessage(error) }, errorStatus(error));
			}
		},
	);

	router.delete(
		"/:id",
		route({
			tags: ["Auth"],
			operationId: "revokeAgentKey",
			summary: "Revoke an agent API key",
			description: "Deletes one of the signed-in user's keys. Another user's key is a 404.",
			responses: {
				200: jsonResponse("Key revoked.", OkSchema),
				401: jsonResponse("Not signed in.", ErrorSchema),
				404: jsonResponse("Key not found.", ErrorSchema),
				503: jsonResponse("Auth is not configured in this environment.", ErrorSchema),
			},
		}),
		async (c) => {
			const auth = await getTokensAuth(c.req.url, c.env);
			if (!auth) return c.json({ error: "auth not configured in this environment" }, 503);

			try {
				await apiKeyApi(auth).deleteApiKey({
					body: { keyId: c.req.param("id") },
					headers: c.req.raw.headers,
				});
				return c.json({ ok: true as const });
			} catch (error) {
				return c.json({ error: errorMessage(error) }, errorStatus(error));
			}
		},
	);

	return router;
}
