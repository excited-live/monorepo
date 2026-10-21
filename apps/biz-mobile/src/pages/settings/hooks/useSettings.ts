import { useState } from "react";
import { useUserData, useAppUI } from "../../../state";
import { t } from "../../../i18n";
import { useAgentKeys, useRevokeAgentKey } from "../../../service";

export function useSettings() {
	const {
		userSession,
		isCloudAccount,
		signOut,
	} = useUserData();

	const {
		lang,
		setLang,
	} = useAppUI();

	const [isSignInOpen, setIsSignInOpen] = useState(false);

	const agentKeysQuery = useAgentKeys();
	const revokeAgentKeyMutation = useRevokeAgentKey();
	const revokeAgentKey = (id: string) => revokeAgentKeyMutation.mutate(id);

	return {
		userSession,
		isCloudAccount,
		signOut,
		lang,
		setLang,
		isSignInOpen,
		setIsSignInOpen,
		agentKeys: agentKeysQuery.data ?? [],
		agentKeysLoading: agentKeysQuery.isLoading,
		agentKeysError: agentKeysQuery.isError,
		revokeAgentKey,
		t: (key: Parameters<typeof t>[0]) => t(key, lang),
	};
}
