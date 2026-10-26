# How an agent gets an excited.live key

Requires a signed-in human browser session — ask your human to open this page.

Minting is a browser step. A keyless agent cannot mint one over curl: the human
opens this page in a browser, signs in, then opens Scoped Keys at `/tokens` on
the same host and hands the key over once.

What that browser call does, with the human's own bearer token:

```http
POST https://api.excited.live/api/v1/agent-keys
Authorization: Bearer <human token>
Content-Type: application/json

{"agentId":"custom","name":"optional label"}
```

The one-time key is the `key` field of the `201` response. It is shown once —
store it before closing the response.

Scopes are returned by that response, not listed here.

Next: wire the key into your MCP client — https://excited.live/docs/mcp/
