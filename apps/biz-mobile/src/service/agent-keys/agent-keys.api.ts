import { getApiBaseUrl } from "../http/base-url";
import { tokenStore } from "../auth/token.store";
import { AgentKeyError } from "./agent-keys.error";

/** A minted key as listed by `GET /api/v1/agent-keys` (never includes the secret). */
export interface AgentKeyRecord {
	id: string;
	name?: string | null;
	start?: string | null;
	agentId: string | null;
	createdAt?: string | null;
	expiresAt?: string | null;
	lastRequest?: string | null;
}

/** `POST /api/v1/agent-keys` is the only response that carries the full key. */
export interface CreatedAgentKey {
	id: string;
	key: string;
	name?: string | null;
	start?: string | null;
	expiresAt?: string | null;
}

export interface CreateAgentKeyInput {
	agentId: string;
	name?: string;
}

const getAgentKeysBase = (): string => `${getApiBaseUrl()}/api/v1/agent-keys`;

const getHeaders = (): Record<string, string> => {
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	const token = tokenStore.getToken();
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
};

const readList = (body: unknown): AgentKeyRecord[] => {
	if (Array.isArray(body)) return body as AgentKeyRecord[];
	if (body && typeof body === "object") {
		const record = body as { keys?: AgentKeyRecord[]; data?: AgentKeyRecord[] };
		if (Array.isArray(record.keys)) return record.keys;
		if (Array.isArray(record.data)) return record.data;
	}
	return [];
};

export const agentKeysApi = {
	async create(input: CreateAgentKeyInput): Promise<CreatedAgentKey> {
		const res = await fetch(`${getAgentKeysBase()}`, {
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify(input),
		});
		if (!res.ok) throw new AgentKeyError(res.status, `Create agent key failed HTTP ${res.status}`);
		const body = (await res.json()) as CreatedAgentKey | { data: CreatedAgentKey };
		return "data" in body ? body.data : body;
	},

	async list(): Promise<AgentKeyRecord[]> {
		const res = await fetch(`${getAgentKeysBase()}`, { headers: getHeaders() });
		if (!res.ok) throw new Error(`List agent keys failed HTTP ${res.status}`);
		return readList(await res.json());
	},

	async revoke(id: string): Promise<void> {
		const res = await fetch(`${getAgentKeysBase()}/${encodeURIComponent(id)}`, {
			method: "DELETE",
			headers: getHeaders(),
		});
		if (!res.ok) throw new Error(`Revoke agent key failed HTTP ${res.status}`);
	},
};

/** MCP endpoint exposed to agents. */
export function getMcpServerUrl(): string {
	return `${getApiBaseUrl()}/mcp`;
}

/** Webapp origin used by the OAuth and device link flows; `null` when not configured. */
export function getAgentWebappUrl(): string | null {
	const raw = import.meta.env.VITE_WEBAPP_URL;
	if (!raw) return null;
	return raw.replace(/\/+$/, "");
}
