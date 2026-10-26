import { describe, expect, it } from "vitest"
import { parseJsonRpcText } from "./queries"

/**
 * The live MCP registry (#90) reads the same endpoint a client does, and the
 * transport may answer as JSON or as SSE. These tests pin both shapes plus the
 * proxy case that drops the content type.
 */
describe("parseJsonRpcText", () => {
	const result = { jsonrpc: "2.0", id: 1, result: { tools: [{ name: "get_financial_summary" }] } }

	it("parses a plain JSON reply", () => {
		expect(parseJsonRpcText(JSON.stringify(result), "application/json")).toEqual(result)
	})

	it("parses the first SSE data frame", () => {
		const sse = `event: message\ndata: ${JSON.stringify(result)}\n\n`
		expect(parseJsonRpcText(sse, "text/event-stream")).toEqual(result)
	})

	it("skips keep-alive comments before the frame", () => {
		const sse = `: keep-alive\n\nevent: message\ndata: ${JSON.stringify(result)}\n\n`
		expect(parseJsonRpcText(sse, "text/event-stream")).toEqual(result)
	})

	it("falls back to the SSE parser when the content type is missing", () => {
		const sse = `data: ${JSON.stringify(result)}\n\n`
		expect(parseJsonRpcText(sse, "")).toEqual(result)
	})

	it("returns null for an empty body", () => {
		expect(parseJsonRpcText("", "application/json")).toBeNull()
	})

	it("throws when no JSON-RPC frame is present", () => {
		expect(() => parseJsonRpcText("event: ping\n\n", "text/event-stream")).toThrow(/no JSON-RPC result/)
	})
})
