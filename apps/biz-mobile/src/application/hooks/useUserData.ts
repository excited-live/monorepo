import { useMemo, useState } from "react";
import type { UserSession } from "../../domain/types";
import {
	useSession,
	useSignIn,
	useSignUp,
	useGoogleSignIn,
	useSignOut,
} from "../../service/auth";

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
	const { data: user } = useSession();
	const signInMutation = useSignIn();
	const signUpMutation = useSignUp();
	const googleSignInMutation = useGoogleSignIn();
	const signOutMutation = useSignOut();

	const [localOverrides, setLocalOverrides] = useState<Partial<UserSession>>({});

	const userSession = useMemo<UserSession>(() => {
		if (user) {
			return {
				id: user.id,
				email: user.email,
				name: user.name,
				orgName: "Personal",
				isAuthenticated: true,
				avatarUrl: user.image ?? undefined,
				...localOverrides,
			};
		}
		return {
			id: "guest",
			email: "",
			name: "Guest User",
			orgName: "Personal",
			isAuthenticated: false,
			...localOverrides,
		};
	}, [user, localOverrides]);

	const isCloudAccount = userSession.isAuthenticated && Boolean(userSession.email);

	const signInWithEmail = async (email: string, password: string) => {
		await signInMutation.mutateAsync({ email, password });
	};

	const signUpWithEmail = async (email: string, password: string, name: string) => {
		await signUpMutation.mutateAsync({ email, password, name });
	};

	const signInWithGoogle = async (idToken: string) => {
		await googleSignInMutation.mutateAsync(idToken);
	};

	const signOut = async () => {
		await signOutMutation.mutateAsync();
		setLocalOverrides({});
	};

	const updateUserProfile = (profile: Partial<UserSession>) => {
		setLocalOverrides((prev) => ({ ...prev, ...profile }));
	};

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
