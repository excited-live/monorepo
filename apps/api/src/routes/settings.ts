import { Hono } from "hono"
import type { ApiEnv } from "../lib/env"
import { getUserId } from "../lib/request"
import { jsonBody, jsonResponse, route } from "../openapi/docs"
import { OkSchema, UserSettingsSchema } from "../openapi/schemas"
import { createSettingsStore, type UserSettings } from "../stores/settings-store"

/**
 * Settings routes. Same shape as before persistence: `GET` returns the stored
 * settings (defaults for an unknown user, `birthday` absent when unset) and
 * `PUT` echoes the body.
 */
export function createSettingsRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>()

	router.get(
		"/",
		route({
			tags: ["Settings"],
			operationId: "getSettings",
			summary: "Get settings",
			description: 'Defaults (`{ profileName: "", gender: "female" }`) for a user who never saved.',
			responses: { 200: jsonResponse("The settings.", UserSettingsSchema) },
		}),
		async (c) => {
		const settings = await createSettingsStore(c.get("db")).get(getUserId(c))
		return c.json(settings)
	})

	router.put(
		"/",
		route({
			tags: ["Settings"],
			operationId: "saveSettings",
			summary: "Save settings",
			description: "Echoes the request body; reads back normalised to the three stored columns.",
			requestBody: jsonBody(UserSettingsSchema),
			responses: { 200: jsonResponse("Saved.", OkSchema.extend({ data: UserSettingsSchema })) },
		}),
		async (c) => {
		const userId = getUserId(c)
		const body = await c.req.json<UserSettings>()
		await createSettingsStore(c.get("db")).save(userId, body)
		return c.json({ ok: true, data: body })
	})

	return router
}

export type { UserSettings } from "../stores/settings-store"
