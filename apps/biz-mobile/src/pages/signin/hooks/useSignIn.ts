import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { useUserData, useAppUI } from "../../../state";

export const STRINGS = {
	title: { en: "Financial planner app for Solopreneur", th: "แอปวางแผนการเงินสำหรับนักธุรกิจอิสระ" },
	tabSignIn: { en: "Sign In", th: "เข้าสู่ระบบ" },
	tabSignUp: { en: "Create Account", th: "สมัครสมาชิก" },
	signInWithEmail: { en: "Sign In to Cloud", th: "เข้าสู่ระบบคลาวด์" },
	signUpWithEmail: { en: "Create Cloud Account", th: "สร้างบัญชีคลาวด์" },
	name: { en: "Full Name or Business Name", th: "ชื่อ-นามสกุล หรือชื่อธุรกิจ" },
	namePlaceholder: { en: "e.g. Prame Sukong", th: "เช่น ปราม สุคง" },
	email: { en: "Email", th: "อีเมล" },
	password: { en: "Password", th: "รหัสผ่าน" },
	submittingSignIn: { en: "Signing In…", th: "กำลังเข้าสู่ระบบ…" },
	submittingSignUp: { en: "Creating Account…", th: "กำลังสร้างบัญชี…" },
	google: { en: "Continue with Google", th: "ดำเนินการต่อด้วย Google" },
	googleSubmitting: { en: "Connecting…", th: "กำลังเชื่อมต่อ…" },
	agreePrefix: { en: "I agree to the ", th: "ฉันยอมรับ" },
	termsLink: { en: "Terms & Conditions", th: "ข้อกำหนดและเงื่อนไข" },
	needAccount: { en: "Don't have an account? Create one", th: "ยังไม่มีบัญชี? สร้างบัญชีใหม่" },
	haveAccount: { en: "Already have an account? Sign in", th: "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" },
	genericError: { en: "Sign-in failed. Check your email and password.", th: "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง" },
	networkError: { en: "Could not reach Excited Cloud API. Ensure backend is running (pnpm dev:api).", th: "เชื่อมต่อ Excited Cloud API ไม่ได้ ตรวจสอบว่า API กำลังทำงานอยู่" },
	googleError: { en: "Google sign-in failed. Try again.", th: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง" },
	googleUnavailable: { en: "Google sign-in is available in the mobile app.", th: "การเข้าสู่ระบบด้วย Google ใช้ได้ในแอปมือถือเท่านั้น" },
	googleNotConfigured: { en: "Google sign-in is not configured yet.", th: "ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google" },
	cloudNotice: {
		en: "Cloud-native mode: all financial models, capital flows, and assets sync directly to Excited Cloud.",
		th: "ระบบคลาวด์เนทีฟ: ข้อมูลธุรกิจ โมเดลการเงิน และเงินทุนทั้งหมดจะซิงค์ตรงกับ Excited Cloud",
	},
} as const;

export const TERMS_URL = "https://excited.live/docs/terms";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function useSignIn(onSignedIn?: () => void) {
	const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useUserData();
	const { lang } = useAppUI();

	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const label = (key: keyof typeof STRINGS): string => STRINGS[key][lang];

	const handleSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		if (!acceptedTerms) return;

		const form = event.currentTarget;
		const emailInput = form.querySelector<HTMLInputElement>("#signin-email");
		const passwordInput = form.querySelector<HTMLInputElement>("#signin-password");
		const nameInput = form.querySelector<HTMLInputElement>("#signin-name");

		const cleanEmail = (email || emailInput?.value || "").trim();
		const cleanPassword = password || passwordInput?.value || "";
		const cleanName = (name || nameInput?.value || "").trim() || "Solopreneur";

		if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
			setError(lang === "th" ? "กรุณากรอกอีเมลที่ถูกต้อง" : "Please enter a valid email address.");
			return;
		}
		if (cleanPassword.length < 8) {
			setError(lang === "th" ? "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters long.");
			return;
		}
		setIsLoading(true);
		setError(null);
		try {
			if (mode === "signup") {
				await signUpWithEmail(cleanEmail, cleanPassword, cleanName);
			} else {
				await signInWithEmail(cleanEmail, cleanPassword);
			}
			onSignedIn?.();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			if (msg.includes("fetch") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
				setError(label("networkError"));
			} else if (msg) {
				setError(msg);
			} else {
				setError(label("genericError"));
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		if (!acceptedTerms) return;
		setError(null);
		if (!GOOGLE_CLIENT_ID) {
			setError(label("googleNotConfigured"));
			return;
		}
		if (!isTauri()) {
			setError(label("googleUnavailable"));
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
				setError(label("googleError"));
				return;
			}
			await signInWithGoogle(tokens.idToken);
			onSignedIn?.();
		} catch (err) {
			setError(
				err instanceof Error && err.message.includes("fetch")
					? label("networkError")
					: label("googleError"),
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

	return {
		mode,
		setMode,
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		acceptedTerms,
		setAcceptedTerms,
		isLoading,
		isGoogleLoading,
		error,
		setError,
		lang,
		label,
		handleSubmit,
		handleGoogleSignIn,
		handleTermsClick,
	};
}
