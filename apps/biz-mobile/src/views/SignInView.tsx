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
// Google *web* client ID (Google Cloud Console → OAuth client, Web application
// type). The native Google Sign-In SDK (Tauri plugin) returns an ID token with
// this audience; the API verifies it via BETTER_AUTH_GOOGLE_CLIENT_ID/SECRET.
// Unset → the button reports that Google sign-in is not configured.
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

export const SignInView: React.FC = () => {
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
	};

	return (
		<div className="signin-container">
			<div className="signin-hero">
				<img
					src="/logo-mark.png"
					alt="excited.live"
					style={{
						width: "66px",
						height: "56px",
						objectFit: "contain",
						display: "block",
						marginBottom: "24px",
					}}
				/>

				<div className="header-brand-title" style={{ fontSize: "22px", marginBottom: "8px" }}>
					<span className="brand-root">excited</span>
					<span className="brand-dot">.</span>
					<span className="brand-tld">live</span>
				</div>

				<h1 className="signin-title">{label("title", lang)}</h1>

				<form className="signin-form" onSubmit={handleSignIn}>
					<label className="signin-field">
						<span className="signin-field-label">{label("email", lang)}</span>
						<input
							type="email"
							className="signin-input"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
							required
						/>
					</label>

					<label className="signin-field">
						<span className="signin-field-label">{label("password", lang)}</span>
						<input
							type="password"
							className="signin-input"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							required
						/>
					</label>

					<label className="signin-terms">
						<input
							type="checkbox"
							className="signin-terms-checkbox"
							checked={acceptedTerms}
							onChange={(e) => setAcceptedTerms(e.target.checked)}
							required
						/>
						<span>
							{label("agreePrefix", lang)}{" "}
							<a
								className="signin-terms-link"
								href={TERMS_URL}
								target="_blank"
								rel="noopener noreferrer"
								onClick={handleTermsClick}
							>
								{label("termsLink", lang)}
							</a>
						</span>
					</label>

					{error ? (
						<p className="signin-error" role="alert">
							{error}
						</p>
					) : null}

					<div className="signin-actions">
						<button
							type="submit"
							className="signin-btn-primary"
							disabled={isLoading || !acceptedTerms}
						>
							{isLoading ? label("submitting", lang) : label("signInWithEmail", lang)}
						</button>

						<button
							type="button"
							className="signin-btn-google"
							onClick={handleGoogleSignIn}
							disabled={isGoogleLoading || !acceptedTerms}
						>
							<GoogleIcon />
							{isGoogleLoading ? label("googleSubmitting", lang) : label("google", lang)}
						</button>

						<button
							type="button"
							className="signin-btn-guest"
							onClick={handleGuestAccess}
						>
							{label("guest", lang)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
