import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthUser } from "./auth.api";
import { accountingKeys } from "../accounting/accounting.keys";

export const authKeys = {
	all: ["auth"] as const,
	session: () => [...authKeys.all, "session"] as const,
};

export function useSession() {
	return useQuery<AuthUser | null, Error>({
		queryKey: authKeys.session(),
		queryFn: () => authApi.me(),
		staleTime: 1000 * 60 * 10, // 10 minutes
		retry: false,
	});
}

export function useSignIn() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) =>
			authApi.signInEmail(email, password),
		onSuccess: (data) => {
			queryClient.setQueryData(authKeys.session(), data.user);
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useSignUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
			authApi.signUpEmail(email, password, name),
		onSuccess: (data) => {
			queryClient.setQueryData(authKeys.session(), data.user);
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useGoogleSignIn() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (idToken: string) => authApi.signInWithGoogleIdToken(idToken),
		onSuccess: (data) => {
			queryClient.setQueryData(authKeys.session(), data.user);
			queryClient.invalidateQueries({ queryKey: accountingKeys.all });
		},
	});
}

export function useSignOut() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authApi.signOut(),
		onSuccess: () => {
			queryClient.setQueryData(authKeys.session(), null);
			queryClient.removeQueries({ queryKey: accountingKeys.all });
			queryClient.clear();
		},
	});
}
