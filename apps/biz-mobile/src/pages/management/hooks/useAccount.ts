import { useMemo } from "react";
import type { EntityAccount } from "@excited-live/accounting";
import { useFinances, useAppUI } from "../../../state";

export interface AccountSlice {
	accounts: EntityAccount[];
	activeEntityId: string;
	setActiveEntityId: (id: string) => void;
	activeAccount: EntityAccount;
	isPersonal: boolean;
}

export function useAccount(): AccountSlice {
	const { accounts } = useFinances();
	const { activeEntityId, setActiveEntityId } = useAppUI();

	const activeAccount = useMemo<EntityAccount>(() => {
		return accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	}, [accounts, activeEntityId]);

	const isPersonal = activeAccount?.type === "personal";

	return {
		accounts,
		activeEntityId,
		setActiveEntityId,
		activeAccount,
		isPersonal,
	};
}
