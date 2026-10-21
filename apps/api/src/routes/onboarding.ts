import { Hono } from "hono";
import type { ApiEnv } from "../lib/env";
import { getUserId } from "../lib/request";
import { jsonBody, jsonResponse, route } from "../openapi/docs";
import { ErrorSchema, OkSchema, UpdateUserOnboardingSchema, UserOnboardingSchema } from "../openapi/schemas";
import {
	createOnboardingStore,
	DEFAULT_APP_ID,
} from "../stores/onboarding-store";

export function createOnboardingRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>();

	router.get(
		"/",
		route({
			tags: ["Onboarding"],
			operationId: "getOnboarding",
			summary: "Get onboarding state",
			description: "Returns onboarding progress for the specified app (defaults to biz-mobile).",
			parameters: [
				{
					name: "app",
					in: "query",
					required: false,
					description: "Application ID (e.g. `biz-mobile`, `webapp`). Defaults to `biz-mobile`.",
					schema: { type: "string" },
				},
			],
			responses: { 200: jsonResponse("The onboarding state.", UserOnboardingSchema) },
		}),
		async (c) => {
			const userId = getUserId(c);
			const appId = c.req.query("app") || DEFAULT_APP_ID;
			const data = await createOnboardingStore(c.get("db")).get(userId, appId);
			return c.json(data);
		},
	);

	router.put(
		"/",
		route({
			tags: ["Onboarding"],
			operationId: "saveOnboarding",
			summary: "Save onboarding state",
			description: "Updates onboarding progress, steps completed/skipped, and overall completion status.",
			requestBody: jsonBody(UpdateUserOnboardingSchema),
			responses: {
				200: jsonResponse("Saved.", OkSchema.extend({ data: UserOnboardingSchema })),
				400: jsonResponse("Malformed onboarding payload.", ErrorSchema),
			},
		}),
		async (c) => {
			const userId = getUserId(c);
			const parsed = UpdateUserOnboardingSchema.safeParse(await c.req.json().catch(() => null));
			if (!parsed.success) {
				return c.json({ error: "Malformed onboarding payload" }, 400);
			}
			const saved = await createOnboardingStore(c.get("db")).save(userId, parsed.data);
			return c.json({ ok: true, data: saved });
		},
	);

	return router;
}

export type { UserOnboarding } from "../stores/onboarding-store";
