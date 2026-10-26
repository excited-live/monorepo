/**
 * Re-export of the shared flow helpers — see `@excited-live/auth/flow`.
 *
 * The logic moved to `packages/auth` so `apps/iam` (the no-BFF SPA on another
 * origin) resumes the same OAuth / device flow with one implementation. This
 * file stays so existing imports (`../lib/auth-flow`) and their tests keep
 * pointing at the same module.
 */
export {
	MIN_PASSWORD_LENGTH,
	type AuthClientError,
	type AuthMode,
	type SignUpErrorKind,
	authFailureMessageKey,
	oauthResumePath as oauthResumeUrl,
	parseAuthMode,
	postAuthDestination,
	sanitizeReturnPath,
	signUpErrorKind,
} from "@excited-live/auth/flow"
