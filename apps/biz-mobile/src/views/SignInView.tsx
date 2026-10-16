import React, { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useBiz } from "../state";

/**
 * Sign-in page (in-app). Email + password and native Google sign-in against
 * the Better Auth tokens mount on the API — replaces the WorkOS browser +
 * deep-link flow: no system browser, no token/PII in URLs, fully in-app.
 */
const STRINGS = {
	title: { en: "Financial planner app for Solopreneur", th: "แอปวางแผนการเงินสำหรับนักธุรกิจอิสระ" },
	signInWithEmail: { en: "Sign in with Email", th: "เข้าสู่ระบบด้วยอีเมล" },
	email: { en: "Email", th: "อีเมล" },
	password: { en: "Password", th: "รหัสผ่าน" },
	submitting: { en: "Signing In…", th: "กำลังเข้าสู่ระบบ…" },
	google: { en: "Continue with Google", th: "ดำเนินการต่อด้วย Google" },
	googleSubmitting: { en: "Connecting…", th: "กำลังเชื่อมต่อ…" },
	agreePrefix: { en: "I agree to the ", th: "ฉันยอมรับ" },
	termsLink: { en: "Terms & Conditions", th: "ข้อกำหนดและเงื่อนไข" },
	guest: { en: "Explore Offline Demo", th: "ลองใช้แบบออฟไลน์" },
	genericError: { en: "Sign-in failed. Check your email and password.", th: "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง" },
	networkError: { en: "Could not reach the API. Try again.", th: "เชื่อมต่อ API ไม่ได้ กรุณาลองอีกครั้ง" },
	googleError: { en: "Google sign-in failed. Try again.", th: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง" },
	googleUnavailable: { en: "Google sign-in is available in the mobile app.", th: "การเข้าสู่ระบบด้วย Google ใช้ได้ในแอปมือถือเท่านั้น" },
	googleNotConfigured: { en: "Google sign-in is not configured yet.", th: "ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google" },
} as const;

const TERMS_URL = "https://excited.live/docs/terms";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const label = (key: keyof typeof STRINGS, lang: "en" | "th"): string => STRINGS[key][lang];

const GoogleIcon: React.FC = () => (
	<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
		<path
			fill="#4285F4"
			d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
		/>
		<path
			fill="#34A853"
			d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
		/>
		<path
			fill="#FBBC05"
			d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
		/>
		<path
			fill="#EA4335"
			d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
		/>
	</svg>
);

export const SignInView: React.FC<{ onSignedIn?: () => void }> = ({ onSignedIn }) => {
	const { signInWithEmail, signInWithGoogle, updateUserProfile, lang } = useBiz();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignIn = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!acceptedTerms) return;
		setIsLoading(true);
		setError(null);
		try {
			await signInWithEmail(email, password);
			onSignedIn?.();
		} catch (err) {
			setError(
				err instanceof Error && err.message.includes("fetch")
					? label("networkError", lang)
					: label("genericError", lang),
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		if (!acceptedTerms) return;
		setError(null);
		if (!GOOGLE_CLIENT_ID) {
			setError(label("googleNotConfigured", lang));
			return;
		}
		if (!isTauri()) {
			setError(label("googleUnavailable", lang));
			return;
		}
		setIsGoogleLoading(true);
		try {
			const { signIn: googleSignIn } = await import("@choochmeque/tauri-plugin-google-auth-api");
			const tokens = await googleSignIn({
				clientId: GOOGLE_CLIENT_ID,
				scopes: ["openid", "email", "profile"],
			});
			if (!tokens.idToken) {
				setError(label("googleError", lang));
				return;
			}
			await signInWithGoogle(tokens.idToken);
			onSignedIn?.();
		} catch (err) {
			setError(
				err instanceof Error && err.message.includes("fetch")
					? label("networkError", lang)
					: label("googleError", lang),
			);
		} finally {
			setIsGoogleLoading(false);
		}
	};

	const handleTermsClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (!isTauri()) return;
		event.preventDefault();
		const { openUrl } = await import("@tauri-apps/plugin-opener");
		await openUrl(TERMS_URL);
	};

	const handleGuestAccess = () => {
		updateUserProfile({
			id: "usr_guest",
			name: "Guest Solopreneur",
			email: "guest@excited.live",
			orgName: "Preview Business",
			isAuthenticated: true,
		});
		onSignedIn?.();
	};

	return (
		<div className="signin-container">
			<div className="signin-hero">
				<img
					src="/logo-mark.png"
					alt="Excited Live"
					className="signin-logo"
				/>
				<h1 className="signin-app-title">Excited Live</h1>
				<p className="signin-app-tagline">{label("title", lang)}</p>
			</div>

			<div className="signin-card">
				<form onSubmit={handleSignIn} className="signin-form">
					<div className="signin-field">
						<label htmlFor="signin-email" className="signin-label">
							{label("email", lang)}
						</label>
						<input
							id="signin-email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="signin-input"
							placeholder="you@domain.com"
							disabled={isLoading || isGoogleLoading}
						/>
					</div>

					<div className="signin-field">
						<label htmlFor="signin-password" className="signin-label">
							{label("password", lang)}
						</label>
						<input
							id="signin-password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="signin-input"
							placeholder="••••••••"
							disabled={isLoading || isGoogleLoading}
						/>
					</div>

					<label className="signin-checkbox-label">
						<input
							type="checkbox"
							checked={acceptedTerms}
							onChange={(e) => setAcceptedTerms(e.target.checked)}
							disabled={isLoading || isGoogleLoading}
						/>
						<span>
							{label("agreePrefix", lang)}
							<a
								href={TERMS_URL}
								onClick={handleTermsClick}
								target="_blank"
								rel="noreferrer"
								className="signin-link"
							>
								{label("termsLink", lang)}
							</a>
						</span>
					</label>

					{error && (
						<p role="alert" className="signin-error">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={!acceptedTerms || isLoading || isGoogleLoading}
						className="signin-button primary"
					>
						{isLoading ? label("submitting", lang) : label("signInWithEmail", lang)}
					</button>
				</form>

				<div className="signin-divider">
					<span>or</span>
				</div>

				<button
					type="button"
					onClick={handleGoogleSignIn}
					disabled={!acceptedTerms || isLoading || isGoogleLoading}
					className="signin-button google"
				>
					<GoogleIcon />
					<span>
						{isGoogleLoading ? label("googleSubmitting", lang) : label("google", lang)}
					</span>
				</button>

				<button
					type="button"
					onClick={handleGuestAccess}
					disabled={isLoading || isGoogleLoading}
					className="signin-button guest"
				>
					{label("guest", lang)}
				</button>
			</div>
		</div>
	);
};
