import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	onboardingApi,
	type OnboardingMethod,
	type OnboardingRecord,
	type UpdateOnboardingPayload,
} from "./onboarding.api";

export const onboardingKeys = {
	all: ["onboarding"] as const,
	detail: (appId: string) => [...onboardingKeys.all, appId] as const,
};

export function useOnboarding(appId = "biz-mobile") {
	return useQuery<OnboardingRecord, Error>({
		queryKey: onboardingKeys.detail(appId),
		queryFn: () => onboardingApi.get(appId),
		staleTime: 1000 * 60 * 5,
	});
}

export function useUpdateOnboarding(appId = "biz-mobile") {
	const queryClient = useQueryClient();

	return useMutation<OnboardingRecord, Error, UpdateOnboardingPayload, { previous?: OnboardingRecord }>({
		mutationFn: (payload) => onboardingApi.save({ ...payload, appId }),
		onMutate: async (newPayload) => {
			await queryClient.cancelQueries({ queryKey: onboardingKeys.detail(appId) });
			const previous = queryClient.getQueryData<OnboardingRecord>(onboardingKeys.detail(appId));
			if (previous) {
				queryClient.setQueryData<OnboardingRecord>(onboardingKeys.detail(appId), {
					...previous,
					...newPayload,
					done: newPayload.done ?? previous.done,
					skipped: newPayload.skipped ?? previous.skipped,
					isCompleted: newPayload.isCompleted ?? previous.isCompleted,
					method: newPayload.method === undefined ? previous.method : newPayload.method,
					updatedAt: new Date().toISOString(),
				});
			}
			return { previous };
		},
		onError: (_err, _newPayload, context) => {
			if (context?.previous) {
				queryClient.setQueryData(onboardingKeys.detail(appId), context.previous);
			}
		},
		onSuccess: (data) => {
			queryClient.setQueryData(onboardingKeys.detail(appId), data);
		},
	});
}

/** Save the chosen onboarding path (`agent` or `manual`; `null` clears it). */
export function useSetOnboardingMethod(appId = "biz-mobile") {
	const queryClient = useQueryClient();

	return useMutation<OnboardingRecord, Error, OnboardingMethod | null, { previous?: OnboardingRecord }>({
		mutationFn: (method) => onboardingApi.save({ appId, method }),
		onMutate: async (method) => {
			await queryClient.cancelQueries({ queryKey: onboardingKeys.detail(appId) });
			const previous = queryClient.getQueryData<OnboardingRecord>(onboardingKeys.detail(appId));
			if (previous) {
				queryClient.setQueryData<OnboardingRecord>(onboardingKeys.detail(appId), {
					...previous,
					method,
				});
			}
			return { previous };
		},
		onError: (_err, _method, context) => {
			if (context?.previous) {
				queryClient.setQueryData(onboardingKeys.detail(appId), context.previous);
			}
		},
		onSuccess: (data) => {
			queryClient.setQueryData(onboardingKeys.detail(appId), data);
		},
	});
}
