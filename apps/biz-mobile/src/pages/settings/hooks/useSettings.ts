import { useState } from "react";
import { useUserData, useAppUI } from "../../../state";
import { t } from "../../../i18n";

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

	return {
		userSession,
		isCloudAccount,
		signOut,
		lang,
		setLang,
		isSignInOpen,
		setIsSignInOpen,
		t: (key: Parameters<typeof t>[0]) => t(key, lang),
	};
}
