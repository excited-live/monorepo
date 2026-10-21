import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserOnboarding } from "@excited-live/api/client";
import { onboardingApi, type UpdateOnboardingPayload } from "./onboarding.api";

export const onboardingKeys = {
	all: ["onboarding"] as const,
	detail: (appId: string) => [...onboardingKeys.all, appId] as const,
};

export function useOnboarding(appId = "biz-mobile") {
	return useQuery<UserOnboarding, Error>({
		queryKey: onboardingKeys.detail(appId),
		queryFn: () => onboardingApi.get(appId),
		staleTime: 1000 * 60 * 5,
	});
}

export function useUpdateOnboarding(appId = "biz-mobile") {
	const queryClient = useQueryClient();

	return useMutation<UserOnboarding, Error, UpdateOnboardingPayload, { previous?: UserOnboarding }>({
		mutationFn: (payload) => onboardingApi.save({ ...payload, appId }),
		onMutate: async (newPayload) => {
			await queryClient.cancelQueries({ queryKey: onboardingKeys.detail(appId) });
			const previous = queryClient.getQueryData<UserOnboarding>(onboardingKeys.detail(appId));
			if (previous) {
				queryClient.setQueryData<UserOnboarding>(onboardingKeys.detail(appId), {
					...previous,
					...newPayload,
					done: newPayload.done ?? previous.done,
					skipped: newPayload.skipped ?? previous.skipped,
					isCompleted: newPayload.isCompleted ?? previous.isCompleted,
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
