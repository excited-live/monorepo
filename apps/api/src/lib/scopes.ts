/**
 * The scope vocabulary shared by agent API keys, OAuth access tokens and `/mcp`.
 *
 * There are two spellings of one policy:
 *
 * - **Request scopes** (`REQUEST_SCOPES`) are what a caller may ask for. They are
 *   exactly the three strings the protected-resource metadata advertises and
 *   OAuth consent asks for (`OAUTH_SCOPES_SUPPORTED`), so an integrator meets one
 *   vocabulary on both credential types. `onboarding` is the umbrella for both
 *   onboarding halves; accounting read and write stays separate.
 * - **Tool scopes** (`ALL_SCOPES`) are what the tool registry gates on. A request
 *   scope expands to its tool scopes in exactly one place,
 *   `permissionsFromRequestScopes`, and `grantedScopes` collapses the stored
 *   permissions back for the API response.
 *
 * There is no implication between request tokens: `accounting:write` does not
 * carry read, and a read token never carries a write. A full accounting agent
 * asks for both (#161).
 */

/** The tokens a mint request may carry — the PRM/OAuth vocabulary. */
export const REQUEST_SCOPES = ["onboarding", "accounting:read", "accounting:write"] as const;

export type RequestScope = (typeof REQUEST_SCOPES)[number];

/** The scopes `/mcp` tools require. */
export const ALL_SCOPES = [
	"onboarding:read",
	"onboarding:write",
	"accounting:read",
	"accounting:write",
] as const;

export type Scope = (typeof ALL_SCOPES)[number];

/**
 * What an omitted `scopes` means: today's grant, unchanged.
 *
 * Every `elk_` key minted before #161 stores both domains in full, and the
 * onboarding agents (#58/#31) depend on the write half, so an omission is not a
 * request to narrow. Narrowing is opt-in and explicit.
 */
export const DEFAULT_AGENT_KEY_REQUEST_SCOPES: readonly RequestScope[] = [...REQUEST_SCOPES];

/** The one place a request token becomes tool scopes. `onboarding` is both halves. */
const EXPANSIONS: Record<RequestScope, readonly Scope[]> = {
	onboarding: ["onboarding:read", "onboarding:write"],
	"accounting:read": ["accounting:read"],
	"accounting:write": ["accounting:write"],
};

export function isRequestScope(value: string): value is RequestScope {
	return (REQUEST_SCOPES as readonly string[]).includes(value);
}

/** Deduplicate and order by the request vocabulary, so a grant always serializes the same way. */
export function sortRequestScopes(scopes: Iterable<string>): RequestScope[] {
	const present = new Set(scopes);
	return REQUEST_SCOPES.filter((scope) => present.has(scope));
}

/** The plugin-shaped permissions for a request: `["accounting:read"]` → `{accounting:["read"]}`. */
export function permissionsFromRequestScopes(scopes: Iterable<RequestScope>): Record<string, string[]> {
	const permissions: Record<string, string[]> = {};
	for (const scope of sortRequestScopes(scopes)) {
		for (const toolScope of EXPANSIONS[scope]) {
			const separator = toolScope.lastIndexOf(":");
			const resource = toolScope.slice(0, separator);
			const action = toolScope.slice(separator + 1);
			(permissions[resource] ??= []).push(action);
		}
	}
	return permissions;
}

/** `{ accounting: ["read"] }` → `{ "accounting:read" }` (the shape `/mcp` enforces). */
export function scopesFromPermissions(
	permissions: Record<string, string[]> | null | undefined,
): Set<string> {
	const scopes = new Set<string>();
	for (const [resource, actions] of Object.entries(permissions ?? {})) {
		for (const action of actions) scopes.add(`${resource}:${action}`);
	}
	return scopes;
}

/** The tool scopes a stored key holds, sorted — what `/mcp` actually gates on. */
export function scopeList(permissions: Record<string, string[]> | null | undefined): Scope[] {
	const held = scopesFromPermissions(permissions);
	return ALL_SCOPES.filter((scope) => held.has(scope));
}

/**
 * Project stored permissions back onto the request vocabulary for the mint
 * receipt and `GET /api/v1/agent-keys`.
 *
 * Derived from what was stored, never from what was requested. `onboarding`
 * collapses only when both halves are held, so even a key with a half grant
 * (not creatable through the API, but possible in storage) is described
 * truthfully rather than overstated.
 */
export function grantedScopes(permissions: Record<string, string[]> | null | undefined): string[] {
	const held = scopesFromPermissions(permissions);
	const granted: string[] = [];
	const onboardingRead = held.has("onboarding:read");
	const onboardingWrite = held.has("onboarding:write");
	if (onboardingRead && onboardingWrite) {
		granted.push("onboarding");
	} else {
		if (onboardingRead) granted.push("onboarding:read");
		if (onboardingWrite) granted.push("onboarding:write");
	}
	for (const scope of ["accounting:read", "accounting:write"] as const) {
		if (held.has(scope)) granted.push(scope);
	}
	return granted;
}
