export const agentKeyQueries = {
	all: ["agent-keys"] as const,
	list: () => [...agentKeyQueries.all, "list"] as const,
};
