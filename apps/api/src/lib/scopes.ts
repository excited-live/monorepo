/**
 * The scope vocabulary shared by agent API keys and OAuth access tokens.
 *
 * A scope is `<resource>:<action>`. This list is the whole policy: a credential
 * can never carry anything outside it, and the tools gate on the exact string
 * (`registry.ts`). Read and write are independent on purpose — a key minted
 * with `accounting:read` must be provably unable to change the books (#161),
 * so a write scope is never implied by a read scope.
 */

/** Every scope this API understands, in the order responses should list them. */
export const ALL_SCOPES = [
	"onboarding:read",
	"onboarding:write",
	"accounting:read",
	"accounting:write",
] as const;

export type Scope = (typeof ALL_SCOPES)[number];

/**
 * What a key gets when the mint request names no scope: reads of both domains,
 * no writes. Least privilege is the default; a caller that needs to change the
 * books has to ask for a write scope explicitly.
 */
export const DEFAULT_AGENT_KEY_SCOPES: readonly Scope[] = ["onboarding:read", "accounting:read"];

export function isScope(value: string): value is Scope {
	return (ALL_SCOPES as readonly string[]).includes(value);
}

/** Deduplicate and order by `ALL_SCOPES`, so the same grant always serializes the same way. */
export function sortScopes(scopes: Iterable<string>): Scope[] {
	const present = new Set(scopes);
	return ALL_SCOPES.filter((scope) => present.has(scope));
}

/** `{ accounting: ["read"] }` → `{ "accounting:read" }` (the plugin's storage shape). */
export function scopesFromPermissions(
	permissions: Record<string, string[]> | null | undefined,
): Set<string> {
	const scopes = new Set<string>();
	for (const [resource, actions] of Object.entries(permissions ?? {})) {
		for (const action of actions) scopes.add(`${resource}:${action}`);
	}
	return scopes;
}

/** The inverse of `scopesFromPermissions`, ready to hand to the apiKey plugin. */
export function permissionsFromScopes(scopes: Iterable<Scope>): Record<string, string[]> {
	const permissions: Record<string, string[]> = {};
	for (const scope of sortScopes(scopes)) {
		const separator = scope.lastIndexOf(":");
		const resource = scope.slice(0, separator);
		const action = scope.slice(separator + 1);
		(permissions[resource] ??= []).push(action);
	}
	return permissions;
}

/** A sorted scope list for a stored key, derived from its permissions. */
export function scopeList(permissions: Record<string, string[]> | null | undefined): Scope[] {
	return sortScopes(scopesFromPermissions(permissions));
}
