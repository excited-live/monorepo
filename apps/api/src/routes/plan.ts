import { Hono } from "hono"
import type { PlanInput } from "@excited-live/sim"
import type { ApiEnv } from "../lib/env"
import { getUserId } from "../lib/request"
import { jsonBody, jsonResponse, route } from "../openapi/docs"
import { OkSchema, PlanInputSchema } from "../openapi/schemas"
import { createPlanStore } from "../stores/plan-store"

/**
 * Plan routes. The store is built per request from the driver the api
 * middleware resolved (`c.var.db`), so this router is backend-agnostic: D1 in
 * the deployment, local SQLite file in dev/test. Response shapes are unchanged.
 */
export function createPlanRouter(): Hono<ApiEnv> {
	const router = new Hono<ApiEnv>()

	router.get(
		"/",
		route({
			tags: ["Plan"],
			operationId: "getPlan",
			summary: "Get the plan",
			description: "The saved plan, or the default plan for a user who never saved.",
			responses: { 200: jsonResponse("The plan document.", PlanInputSchema) },
		}),
		async (c) => {
		const plan = await createPlanStore(c.get("db")).get(getUserId(c))
		return c.json(plan)
	})

	router.put(
		"/",
		route({
			tags: ["Plan"],
			operationId: "savePlan",
			summary: "Save the plan",
			description: "Stores the document as-is; a later GET returns it byte for byte.",
			requestBody: jsonBody(PlanInputSchema),
			responses: { 200: jsonResponse("Saved; echoes the body.", OkSchema.extend({ data: PlanInputSchema })) },
		}),
		async (c) => {
		const userId = getUserId(c)
		const body = await c.req.json<PlanInput>()
		await createPlanStore(c.get("db")).save(userId, body)
		return c.json({ ok: true, data: body })
	})

	return router
}
