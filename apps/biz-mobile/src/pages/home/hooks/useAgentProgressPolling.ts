import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onboardingKeys } from "../../../service";

/**
 * Refresh onboarding progress while the agent path is on screen, so the
 * checklist fills in as the agent writes through MCP.
 */
export function useAgentProgressPolling(enabled: boolean, appId = "biz-mobile") {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!enabled) return;
		const timer = window.setInterval(() => {
			void queryClient.invalidateQueries({ queryKey: onboardingKeys.detail(appId) });
		}, 5000);
		return () => window.clearInterval(timer);
	}, [enabled, appId, queryClient]);
}
