import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	agentKeysApi,
	type AgentKeyRecord,
	type CreateAgentKeyInput,
	type CreatedAgentKey,
} from "./agent-keys.api";
import { agentKeyQueries } from "./agent-keys.keys";

export function useAgentKeys() {
	return useQuery<AgentKeyRecord[], Error>({
		queryKey: agentKeyQueries.list(),
		queryFn: () => agentKeysApi.list(),
		staleTime: 1000 * 30,
	});
}

export function useCreateAgentKey() {
	const queryClient = useQueryClient();

	return useMutation<CreatedAgentKey, Error, CreateAgentKeyInput>({
		mutationFn: (input) => agentKeysApi.create(input),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: agentKeyQueries.all });
		},
	});
}

export function useRevokeAgentKey() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, string>({
		mutationFn: (id) => agentKeysApi.revoke(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: agentKeyQueries.all });
		},
	});
}
