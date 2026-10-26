import { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../lib/env";
import { apiKeyApi } from "@excited-live/auth";
import { getTokensAuth } from "../lib/auth";
import {
	ALL_SCOPES,
	DEFAULT_AGENT_KEY_SCOPES,
	isScope,
	permissionsFromScopes,
	scopeList,
	sortScopes,
	type Scope,
} from "../lib/scopes";
import { getUserId } from "../lib/request";
import { jsonBody, jsonResponse, route } from "../openapi/docs";
import { ErrorSchema, OkSchema } from "../openapi/schemas";

/**
 * Server-minted agent API keys (`/api/v1/agent-keys`).
 *
 * Keys are created HERE, never by the client calling Better Auth directly, and
 * the grant is chosen by the request: `scopes` is honoured exactly or rejected
 * with a 400 — it is never silently ignored (#161). Omitting `scopes` mints a
 * read-only key for both domains; changing books requires asking for a write
 * scope. A key can still only ever touch onboarding and accounting.
 *
 * The identity middleware runs first, which means an API key itself can never
 * mint another key.
 */

/** 90 days, in seconds (Better Auth's `expiresIn` unit). */
const KEY_TTL_SECONDS = 90 * 24 * 60 * 60;

const allowedScopes = ALL_SCOPES.join(", ");

const CreateAgentKeyBody = z
	.object({
		agentId: z.string().min(1, "agentId is required"),
		name: z.string().min(1).optional(),
		/**
		 * The grant, as `<resource>:<action>` strings. Every entry must be in
		 * `ALL_SCOPES`; an unknown one is a 400 rather than a silent drop.
		 */
		scopes: z.array(z.string()).min(1).optional(),
		/**
		 * The plugin-shaped alias for `scopes` (`{ accounting: ["read"] }`), kept
		 * because it is the name the underlying apiKey API uses. Sending both is
		 * allowed only when they describe the same grant.
		 */
		permissions: z.record(z.string(), z.array(z.string())).optional(),
	})
	.strict();

const AgentKeySchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	start: z.string().nullable(),
	agentId: z.string().nullable(),
	/** The grant, exactly as enforced on `/mcp`. */
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
	scopes: z.array(z.string()).describe("The grant. Read-only unless a write scope was requested."),
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
		return `unknown field(s) ${unknownKey.keys.map((key) => `"${key}"`).join(", ")}; send \`scopes\` and \`permissions\` only`;
	}
	return error.issues.map((issue) => issue.message).join("; ");
}

/**
 * Turn `scopes` / `permissions` into the exact grant to store.
 *
 * Both input shapes normalize to the same scope set. Sending neither means the
 * read-only default; sending both means they must agree, so a request can never
 * ask for one thing and be granted another without knowing.
 */
function requestedScopes(body: z.infer<typeof CreateAgentKeyBody>):
	| { ok: true; scopes: Scope[] }
	| { ok: false; error: string } {
	const fromScopes = body.scopes ? new Set(body.scopes) : undefined;
	const fromPermissions = body.permissions
		? new Set(
				Object.entries(body.permissions).flatMap(([resource, actions]) =>
					actions.map((action) => `${resource}:${action}`),
				),
			)
		: undefined;

	const requested = fromScopes ?? fromPermissions;
	if (!requested) return { ok: true, scopes: [...DEFAULT_AGENT_KEY_SCOPES] };

	if (requested.size === 0) {
		return { ok: false, error: `at least one scope is required; allowed scopes: ${allowedScopes}` };
	}

	const unknown = [...requested].filter((scope) => !isScope(scope));
	if (unknown.length > 0) {
		return {
			ok: false,
			error: `unknown scope(s) ${unknown.map((scope) => `"${scope}"`).join(", ")}; allowed scopes: ${allowedScopes}`,
		};
	}

	if (fromScopes && fromPermissions) {
		const same =
			fromScopes.size === fromPermissions.size && [...fromScopes].every((scope) => fromPermissions.has(scope));
		if (!same) {
			return {
				ok: false,
				error: "`scopes` and `permissions` describe different grants; send one of them or make them agree",
			};
		}
	}

	return { ok: true, scopes: sortScopes(requested) };
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
		scopes: scopeList(key.permissions),
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
				"Creates a 90-day key owned by the signed-in user. `scopes` chooses the grant (`onboarding:read`, `onboarding:write`, `accounting:read`, `accounting:write`); omit it for read-only, or send `permissions` in the same `{resource: [action]}` shape. An unknown scope is a 400, never silently dropped. The granted scopes are returned here and by `GET /api/v1/agent-keys`. The full key is returned once.",
			requestBody: jsonBody(CreateAgentKeyBody),
			responses: {
				201: jsonResponse("The new key. The `key` field is shown only here.", CreatedAgentKeySchema),
				400: jsonResponse("Malformed request, or a scope outside the allowed set.", ErrorSchema),
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
			if (!granted.ok) return c.json({ error: granted.error }, 400);

			const userId = getUserId(c);
			const permissions = permissionsFromScopes(granted.scopes);
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
						// Echo what the plugin stored when it reports it back; a key
						// row with no permissions is honestly reported as no scopes.
						scopes: created.permissions == null ? granted.scopes : scopeList(created.permissions),
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
