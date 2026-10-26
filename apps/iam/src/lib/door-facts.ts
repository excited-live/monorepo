/**
 * The key door — the one place these facts are written (#223).
 *
 * iam is a client-only SPA, so before this module a curl-only agent received
 * the same 1,071-byte JavaScript shell for every path: no mint route, no
 * handoff sentence, no way to tell "blocked" from "missing a step". The facts
 * below are rendered three ways from this module:
 *
 *   - the server-rendered `<main id="door-fallback">` inside the built
 *     `/tokens` and `/sign-in` pages (see the `iam-door-pages` Vite plugin),
 *   - `/tokens.md` and `/keys.md`, the markdown mirrors,
 *   - `public/404.html`, which answers every path that is not a route.
 *
 * There is no scope list here on purpose. The API returns a new key's scopes in
 * its own `201`, and a static list would drift into an invented capability —
 * the same rule as #203. Design ruling on #223 (§4) fixes the four sentences
 * below; keep them verbatim so the HTML and the markdown cannot disagree.
 *
 * This file must stay dependency-free: the Vite config imports it in Node at
 * build time, and the tests import it without a DOM.
 */

/** Client-side mount point for the server-rendered door (never inside #root). */
export const DOOR_FALLBACK_ID = "door-fallback"

/** Fact 1 — minting is a human-browser step, not a keyless API call. */
export const DOOR_HANDOFF =
	"Requires a signed-in human browser session — ask your human to open this page."

/** Fact 2 — the exact call the human's browser makes. */
export const DOOR_MINT_URL = "https://api.excited.live/api/v1/agent-keys"

/** Fact 3 — where the rest of the setup lives. */
export const DOOR_DOCS_URL = "https://excited.live/docs/mcp/"

/** Fact 4 — the reason this page lists no scope names. */
export const DOOR_SCOPES = "Scopes are returned by that response, not listed here."

/** The body both markdown mirrors serve. `keys.md` is a byte-identical copy. */
export function renderDoorMarkdown(): string {
	return `# How an agent gets an excited.live key

${DOOR_HANDOFF}

Minting is a browser step. A keyless agent cannot mint one over curl: the human
opens this page in a browser, signs in, then opens Scoped Keys at \`/tokens\` on
the same host and hands the key over once.

What that browser call does, with the human's own bearer token:

\`\`\`http
POST ${DOOR_MINT_URL}
Authorization: Bearer <human token>
Content-Type: application/json

{"agentId":"custom","name":"optional label"}
\`\`\`

The one-time key is the \`key\` field of the \`201\` response. It is shown once —
store it before closing the response.

${DOOR_SCOPES}

Next: wire the key into your MCP client — ${DOOR_DOCS_URL}
`
}

/**
 * The server-rendered fallback, injected outside `#root` in the built
 * `/tokens` and `/sign-in` documents. `main.tsx` removes it on mount, so a
 * browser that runs JavaScript never sees it twice.
 *
 * Plain semantic HTML with no app classes: it has to be readable from the
 * response alone, before React, and it is identical for every door page so
 * `/keys` can be a byte-identical rewrite of `/tokens`.
 */
export function renderDoorFallback(): string {
	return `<main id="${DOOR_FALLBACK_ID}">
	<h1>How an agent gets an excited.live key</h1>
	<p><strong>${DOOR_HANDOFF}</strong></p>
	<p>Minting is a browser step. A keyless agent cannot mint one over curl: the human opens this page in a browser, signs in, then opens Scoped Keys at <a href="/tokens">/tokens</a> on the same host and hands the key over once.</p>
	<p>What that browser call does, with the human's own bearer token:</p>
	<pre><code>POST ${DOOR_MINT_URL}
Authorization: Bearer &lt;human token&gt;
Content-Type: application/json

{"agentId":"custom","name":"optional label"}</code></pre>
	<p>The one-time key is the <code>key</code> field of the <code>201</code> response. It is shown once — store it before closing the response.</p>
	<p>${DOOR_SCOPES}</p>
	<p>Next: wire the key into your MCP client — <a href="${DOOR_DOCS_URL}">${DOOR_DOCS_URL}</a></p>
</main>`
}
