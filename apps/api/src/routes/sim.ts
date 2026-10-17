import { Hono } from "hono"
import {
	defaultMonteCarloConfig,
	runMonteCarlo,
	runSimulation,
	type MonteCarloConfig,
	type PlanInput,
} from "@excited-live/sim"

import { jsonBody, jsonResponse, route } from "../openapi/docs"
import { ErrorSchema, PlanInputSchema } from "../openapi/schemas"
import { z } from "zod"

export const simRouter = new Hono()

const simResult = z.record(z.string(), z.unknown()).describe("Result shape is defined by `@excited-live/sim`.")

simRouter.post(
	"/monte-carlo",
	route({
		tags: ["Simulation"],
		operationId: "runMonteCarlo",
		summary: "Run a Monte Carlo simulation",
		description: "Stateless; nothing is stored. `config` defaults to the engine's default configuration.",
		requestBody: jsonBody(z.object({ plan: PlanInputSchema, config: z.record(z.string(), z.unknown()).optional() })),
		responses: {
			200: jsonResponse("Monte Carlo result.", simResult),
			400: jsonResponse("Body is not `{ plan, config? }`.", ErrorSchema),
		},
	}),
	async (c) => {
	const body = await c.req.json<{ plan: PlanInput; config?: MonteCarloConfig }>()
	if (!body?.plan) {
		return c.json({ error: "Body must be { plan, config? }" }, 400)
	}
	const config = body.config ?? defaultMonteCarloConfig
	const result = runMonteCarlo(body.plan, config)
	return c.json(result)
})

simRouter.post(
	"/simulate",
	route({
		tags: ["Simulation"],
		operationId: "runSimulation",
		summary: "Run a deterministic simulation",
		description: "Stateless; nothing is stored.",
		requestBody: jsonBody(z.object({ plan: PlanInputSchema })),
		responses: {
			200: jsonResponse("Simulation result.", simResult),
			400: jsonResponse("Body is not `{ plan }`.", ErrorSchema),
		},
	}),
	async (c) => {
	const body = await c.req.json<{ plan: PlanInput }>()
	if (!body?.plan) {
		return c.json({ error: "Body must be { plan }" }, 400)
	}
	const result = runSimulation(body.plan)
	return c.json(result)
})
