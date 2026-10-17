import { useBiz } from "../context/useBiz";
import type { UserSession } from "../../domain/types";

export interface UserDataSlice {
	userSession: UserSession;
	isCloudAccount: boolean;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
	signInWithGoogle: (idToken: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateUserProfile: (profile: Partial<UserSession>) => void;
}

export function useUserData(): UserDataSlice {
	const {
		userSession,
		signInWithEmail,
		signUpWithEmail,
		signInWithGoogle,
		signOut,
		updateUserProfile,
	} = useBiz();

	const isCloudAccount = userSession.isAuthenticated && Boolean(userSession.email);

	return {
		userSession,
		isCloudAccount,
		signInWithEmail,
		signUpWithEmail,
		signInWithGoogle,
		signOut,
		updateUserProfile,
	};
}
