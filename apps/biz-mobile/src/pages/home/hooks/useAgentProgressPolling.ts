import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
	accountingKeys,
	onboardingKeys,
	type OnboardingRecord,
} from "../../../service";

/** Everything that proves the agent moved: timestamps plus the step sets. */
const progressSignature = (record: OnboardingRecord | undefined): string =>
	record
		? `${record.updatedAt}|${record.done.join(",")}|${record.skipped.join(",")}`
		: "";

/**
 * Refresh onboarding progress while the agent path is on screen, so the
 * checklist fills in as the agent writes through MCP. Accounting data comes
 * from its own queries, so refresh those too: right after onboarding changes,
 * and on a slower cadence for entries an agent adds before finishing a step.
 */
export function useAgentProgressPolling(enabled: boolean, appId = "biz-mobile") {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!enabled) return;

		let lastSignature = progressSignature(
			queryClient.getQueryData<OnboardingRecord>(onboardingKeys.detail(appId)),
		);

		const refreshOnboarding = async () => {
			await queryClient.invalidateQueries({ queryKey: onboardingKeys.detail(appId) });
			const nextSignature = progressSignature(
				queryClient.getQueryData<OnboardingRecord>(onboardingKeys.detail(appId)),
			);
			if (nextSignature === lastSignature) return;
			lastSignature = nextSignature;
			void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		};

		const onboardingTimer = window.setInterval(() => void refreshOnboarding(), 5000);
		const accountingTimer = window.setInterval(() => {
			void queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		}, 15000);

		return () => {
			window.clearInterval(onboardingTimer);
			window.clearInterval(accountingTimer);
		};
	}, [enabled, appId, queryClient]);
}
