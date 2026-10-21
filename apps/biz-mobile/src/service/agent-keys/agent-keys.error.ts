/** HTTP failure from the agent-keys API, keeping the status for callers to branch on. */
export class AgentKeyError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "AgentKeyError";
		this.status = status;
	}
}
