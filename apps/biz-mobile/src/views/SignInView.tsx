import React, { useState } from "react";
import { BizOrbitMark, FeyMark } from "@excited-live/design-system";
import { useBiz } from "../state";

/**
 * Sign-in page (in-app). Email + password against the Better Auth tokens
 * mount on the API — replaces the WorkOS browser + deep-link flow: no system
 * browser, no token/PII in URLs, fully in-app.
 */
const STRINGS = {
	title: { en: "Autonomous Solopreneur Treasury", th: "ห้องสมุดเงินทุนของนักธุรกิจอิสระ" },
	signIn: { en: "Sign In", th: "เข้าสู่ระบบ" },
	email: { en: "Email", th: "อีเมล" },
	password: { en: "Password", th: "รหัสผ่าน" },
	submitting: { en: "Signing In…", th: "กำลังเข้าสู่ระบบ…" },
	guest: { en: "Explore Offline Demo", th: "ลองใช้แบบออฟไลน์" },
	genericError: { en: "Sign-in failed. Check your email and password.", th: "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง" },
	networkError: { en: "Could not reach the API. Try again.", th: "เชื่อมต่อ API ไม่ได้ กรุณาลองอีกครั้ง" },
} as const;

const label = (key: keyof typeof STRINGS, lang: "en" | "th"): string => STRINGS[key][lang];

export const SignInView: React.FC = () => {
	const { signInWithEmail, updateUserProfile, lang } = useBiz();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignIn = async (event: React.FormEvent) => {
		event.preventDefault();
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

	const handleGuestAccess = () => {
		updateUserProfile({
			id: "usr_guest",
			name: "Guest Solopreneur",
			email: "guest@excited.live",
			orgName: "Preview Venture",
			isAuthenticated: true,
		});
	};

	return (
		<div className="signin-container">
			<div className="signin-hero">
				<div className="signin-medallion">
					<BizOrbitMark size={56} />
				</div>

				<div className="header-brand-title" style={{ fontSize: "22px", marginBottom: "8px" }}>
					<span className="brand-root">excited</span>
					<span className="brand-dot">.</span>
					<span className="brand-tld">biz</span>
				</div>

				<h1 className="signin-title">{label("title", lang)}</h1>

				<p className="signin-subtitle">
					Real-time cash reserves, runway simulations, and capital isolation designed specifically for independent builders.
				</p>

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

					{error ? (
						<p className="signin-error" role="alert">
							{error}
						</p>
					) : null}

					<div className="signin-actions">
						<button
							type="submit"
							className="signin-btn-primary"
							disabled={isLoading}
						>
							<span
								style={{
									width: "8px",
									height: "8px",
									borderRadius: "50%",
									backgroundColor: "var(--signal-orange, #CF4500)",
									display: "inline-block",
								}}
							/>
							{isLoading ? label("submitting", lang) : label("signIn", lang)}
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

			<footer className="signin-footer">
				<div className="signin-footer-brand">
					<FeyMark size={16} />
					<span>Powered by <strong>excited.live</strong></span>
				</div>
				<p className="signin-footer-sub">
					Connects seamlessly with the excited.live ecosystem
				</p>
			</footer>
		</div>
	);
};
