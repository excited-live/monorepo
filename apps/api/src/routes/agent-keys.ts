import { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../lib/env";
import { apiKeyApi } from "@excited-live/auth";
import { getTokensAuth } from "../lib/auth";
import {
	DEFAULT_AGENT_KEY_REQUEST_SCOPES,
	REQUEST_SCOPES,
	grantedScopes,
	isRequestScope,
	permissionsFromRequestScopes,
	sortRequestScopes,
	type RequestScope,
} from "../lib/scopes";
import { getUserId } from "../lib/request";
import { jsonBody, jsonResponse, route } from "../openapi/docs";
import { ErrorSchema, OkSchema } from "../openapi/schemas";

/**
 * Server-minted agent API keys (`/api/v1/agent-keys`).
 *
 * Keys are created HERE, never by the client calling Better Auth directly, and
 * the grant is chosen by the request: `scopes` is honoured exactly or rejected
 * with a 400 — it is never silently ignored (#161). Omitting `scopes` keeps
 * today's full read+write grant, so existing onboarding agents are not narrowed;
 * a read-only key is an explicit request. A key can still only ever touch
 * onboarding and accounting.
 *
 * The identity middleware runs first, which means an API key itself can never
 * mint another key.
 */

/** 90 days, in seconds (Better Auth's `expiresIn` unit). */
const KEY_TTL_SECONDS = 90 * 24 * 60 * 60;

const allowedScopes = REQUEST_SCOPES.join(", ");

const CreateAgentKeyBody = z
	.object({
		agentId: z.string().min(1, "agentId is required"),
		name: z.string().min(1).optional(),
		/**
		 * The grant, in the PRM's vocabulary: `onboarding`, `accounting:read`,
		 * `accounting:write`. Every entry must be one of them; an unknown token is
		 * a 400 rather than a silent drop, and there is no `permissions` alias.
		 */
		scopes: z
			.array(z.string())
			.min(1, "at least one scope is required")
			.optional(),
	})
	.strict();

const AgentKeySchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	start: z.string().nullable(),
	agentId: z.string().nullable(),
	/** The grant, derived from storage in the same vocabulary a mint accepts. */
	scopes: z.array(z.string()),
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
	scopes: z.array(z.string()).describe("The granted scopes, derived from what was stored."),
});

type ApiKeyLike = {
	id: string;
	name?: string | null;
	start?: string | null;
	createdAt?: Date | string;
	expiresAt?: Date | string | null;
	lastRequest?: Date | string | null;
	permissions?: Record<string, string[]> | null;
	metadata?: Record<string, unknown> | null;
};

const malformed = (message: string) => ({ error: `Malformed agent key payload: ${message}` });

function issues(error: z.ZodError): string {
	const unknownKey = error.issues.find((issue) => issue.code === "unrecognized_keys");
	if (unknownKey && "keys" in unknownKey) {
		return `unknown field(s) ${unknownKey.keys.map((key) => `"${key}"`).join(", ")}; send \`agentId\`, \`name\` and \`scopes\` only`;
	}
	return error.issues.map((issue) => issue.message).join("; ");
}

/**
 * Turn the request into the exact grant to store.
 *
 * Omitting `scopes` means the full grant every pre-#161 key has; asking for
 * scopes means those scopes and nothing else. An unknown token is rejected with
 * the supported list rather than dropped, because dropping it is the bug.
 */
function requestedScopes(body: z.infer<typeof CreateAgentKeyBody>):
	| { ok: true; scopes: RequestScope[] }
	| { ok: false; error: string } {
	if (!body.scopes) return { ok: true, scopes: [...DEFAULT_AGENT_KEY_REQUEST_SCOPES] };

	const unknown = body.scopes.filter((scope) => !isRequestScope(scope));
	if (unknown.length > 0) {
		return {
			ok: false,
			error: `unknown scope(s) ${unknown.map((scope) => `"${scope}"`).join(", ")}; supported scopes: ${allowedScopes}`,
		};
	}

	return { ok: true, scopes: sortRequestScopes(body.scopes) };
}

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
		// Derived from what the plugin stored, so the list is the truth the
		// tools enforce rather than a copy of the mint request.
		scopes: grantedScopes(key.permissions),
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
				"Creates a 90-day key owned by the signed-in user. `scopes` chooses the grant in the same vocabulary the PRM advertises: `onboarding`, `accounting:read`, `accounting:write`; a token grants exactly itself and `accounting:write` does not imply read. Omit `scopes` for the full read+write grant every key has had (onboarding and accounting). An unknown token is a 400 with `code: \"invalid_scope\"` and the supported list, never silently dropped; unknown body fields are rejected. The granted scopes are returned here and by `GET /api/v1/agent-keys`. The full key is returned once.",
			requestBody: jsonBody(CreateAgentKeyBody),
			responses: {
				201: jsonResponse("The new key. The `key` field is shown only here.", CreatedAgentKeySchema),
				400: jsonResponse("Malformed request, or a scope outside the supported set.", ErrorSchema),
				401: jsonResponse("Not signed in.", ErrorSchema),
				503: jsonResponse("Auth is not configured in this environment.", ErrorSchema),
			},
		}),
		async (c) => {
			const auth = await getTokensAuth(c.req.url, c.env);
			if (!auth) return c.json({ error: "auth not configured in this environment" }, 503);

			const parsed = CreateAgentKeyBody.safeParse(await c.req.json().catch(() => null));
			if (!parsed.success) return c.json(malformed(issues(parsed.error)), 400);

			const granted = requestedScopes(parsed.data);
			if (!granted.ok) {
				return c.json({ error: granted.error, code: "invalid_scope" as const, supported: [...REQUEST_SCOPES] }, 400);
			}

			const userId = getUserId(c);
			const permissions = permissionsFromRequestScopes(granted.scopes);
			try {
				const created = await apiKeyApi(auth).createApiKey({
					body: {
						userId,
						name: parsed.data.name ?? `${parsed.data.agentId} agent`,
						expiresIn: KEY_TTL_SECONDS,
						permissions,
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
						// Derive from the stored row when the plugin echoes it; if it
						// does not, the grant we just persisted is the same set.
						scopes: created.permissions ? grantedScopes(created.permissions) : granted.scopes,
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
			description:
				"Keys owned by the signed-in user, each with the scopes it actually carries. The secret is never returned.",
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
