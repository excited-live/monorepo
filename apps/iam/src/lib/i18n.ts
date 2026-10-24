import { DEFAULT_LOCALE, createTranslator, isLocale, type Dictionary, type Locale, type Translator } from "@excited-live/i18n"
import { useCallback, useEffect, useState } from "react"

/**
 * Bilingual strings for the pages migrated from the webapp (sign-in, consent,
 * device) plus the few labels the hub adds.
 *
 * Reuses `@excited-live/i18n` so the same `{ name }` interpolation and EN
 * fallback apply as in apps/webapp. EN is the product default; TH is offered on
 * the auth pages where the webapp offered it.
 */
const DICTIONARY: Dictionary = {
	"auth.signIn": { en: "Sign in", th: "เข้าสู่ระบบ" },
	"auth.signOut": { en: "Sign out", th: "ออกจากระบบ" },
	"auth.signInTitle": { en: "Sign in to excited.live", th: "เข้าสู่ระบบ excited.live" },
	"auth.signInSubtitle": {
		en: "Use the account your agents already act for.",
		th: "ใช้อีเมลที่เอเจนต์ของคุณใช้งานอยู่",
	},
	"auth.signUpTitle": { en: "Create your account", th: "สร้างบัญชีของคุณ" },
	"auth.signUpSubtitle": {
		en: "One account for the dashboard, the API and every agent you connect.",
		th: "บัญชีเดียวสำหรับแดชบอร์ด API และเอเจนต์ทั้งหมด",
	},
	"auth.email": { en: "Email", th: "อีเมล" },
	"auth.password": { en: "Password", th: "รหัสผ่าน" },
	"auth.name": { en: "Name", th: "ชื่อ" },
	"auth.passwordHint": { en: "At least 8 characters.", th: "อย่างน้อย 8 ตัวอักษร" },
	"auth.createAccount": { en: "Create account", th: "สร้างบัญชี" },
	"auth.continue": { en: "Continue", th: "ดำเนินการต่อ" },
	"auth.continueWithGoogle": { en: "Continue with Google", th: "ดำเนินการต่อด้วย Google" },
	"auth.switchToSignUp": { en: "Create an account instead", th: "สร้างบัญชีใหม่แทน" },
	"auth.switchToSignIn": { en: "I already have an account", th: "ฉันมีบัญชีอยู่แล้ว" },
	"auth.error.invalidCredentials": {
		en: "That email and password do not match.",
		th: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
	},
	"auth.error.generic": {
		en: "Something went wrong. Please try again.",
		th: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง",
	},
	"auth.signUpError.duplicate": {
		en: "An account with this email already exists.",
		th: "อีเมลนี้มีบัญชีอยู่แล้ว",
	},
	"auth.signUpError.invalidEmail": { en: "That email address looks invalid.", th: "อีเมลไม่ถูกต้อง" },
	"auth.signUpError.weakPassword": {
		en: "Use at least 8 characters.",
		th: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
	},
	"auth.signUpError.nameRequired": { en: "Please add your name.", th: "กรุณากรอกชื่อ" },
	"auth.alreadySignedInTitle": { en: "You are already signed in", th: "คุณเข้าสู่ระบบแล้ว" },
	"auth.alreadySignedIn": { en: "Signed in as {email}.", th: "เข้าสู่ระบบด้วย {email}" },
	"auth.notConfigured": {
		en: "Auth is not configured in this environment yet. Ask the team to set BETTER_AUTH_SECRET on the API.",
		th: "สภาพแวดล้อมนี้ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ",
	},
	"auth.consent.title": { en: "Allow access to your account", th: "อนุญาตให้เข้าถึงบัญชีของคุณ" },
	"auth.consent.subtitle": {
		en: "{client} is asking to act on your excited.live data.",
		th: "{client} ขอเข้าถึงข้อมูล excited.live ของคุณ",
	},
	"auth.consent.scopesHeading": { en: "This lets the agent:", th: "สิ่งนี้จะให้สิทธิ์เอเจนต์:" },
	"auth.consent.allow": { en: "Allow", th: "อนุญาต" },
	"auth.consent.deny": { en: "Deny", th: "ปฏิเสธ" },
	"auth.consent.error": {
		en: "Could not record your decision. Please try again.",
		th: "ไม่สามารถบันทึกการตัดสินใจได้",
	},
	"auth.consent.unknownClient": {
		en: "This request is not for a client we recognise.",
		th: "คำขอนี้มาจากไคลเอนต์ที่ไม่รู้จัก",
	},
	"auth.consent.signInRequired": {
		en: "Sign in first so we know whose data this is.",
		th: "กรุณาเข้าสู่ระบบก่อน",
	},
	"auth.device.title": { en: "Connect your agent", th: "เชื่อมต่อเอเจนต์ของคุณ" },
	"auth.device.subtitle": {
		en: "Enter the code your agent is showing you.",
		th: "กรอกรหัสที่เอเจนต์ของคุณแสดง",
	},
	"auth.device.codeLabel": { en: "Device code", th: "รหัสอุปกรณ์" },
	"auth.device.continue": { en: "Continue", th: "ดำเนินการต่อ" },
	"auth.device.approve": { en: "Approve", th: "อนุมัติ" },
	"auth.device.deny": { en: "Deny", th: "ปฏิเสธ" },
	"auth.device.client": { en: "Request from {client}", th: "คำขอจาก {client}" },
	"auth.device.unknownClient": { en: "an unknown agent", th: "เอเจนต์ที่ไม่รู้จัก" },
	"auth.device.success": {
		en: "Approved. You can close this tab and return to your agent.",
		th: "อนุมัติแล้ว กลับไปที่เอเจนต์ของคุณได้",
	},
	"auth.device.denied": { en: "Denied. The agent will not get access.", th: "ปฏิเสธแล้ว เอเจนต์จะไม่ได้รับสิทธิ์" },
	"auth.device.invalidCode": {
		en: "That code is not valid or has expired.",
		th: "รหัสไม่ถูกต้องหรือหมดอายุ",
	},
	"auth.device.signInRequired": {
		en: "Sign in first so we know whose agent this is.",
		th: "กรุณาเข้าสู่ระบบก่อน",
	},
	"auth.device.alreadyProcessed": {
		en: "This code has already been used.",
		th: "รหัสนี้ถูกใช้ไปแล้ว",
	},
	"auth.device.genericError": {
		en: "Could not reach the authorization server.",
		th: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
	},
	"auth.scope.onboarding": {
		en: "Set up your profile and finish onboarding steps.",
		th: "ตั้งค่าโปรไฟล์และทำขั้นตอน onboarding",
	},
	"auth.scope.accountingRead": {
		en: "Read your accounts, assets, income and expenses.",
		th: "อ่านบัญชี ทรัพย์สิน รายรับ และรายจ่าย",
	},
	"auth.scope.accountingWrite": {
		en: "Add and change records in your ledger.",
		th: "เพิ่มและแก้ไขข้อมูลในบัญชีของคุณ",
	},
	"auth.scope.moneyRead": { en: "Read money movements and slips.", th: "อ่านรายการเงินและสลิป" },
	"auth.scope.taxCompute": { en: "Run tax calculations.", th: "คำนวณภาษี" },
	"auth.scope.allPrelive": { en: "Full sandbox access.", th: "เข้าถึง sandbox ทั้งหมด" },
	"auth.locale.switch": { en: "ไทย", th: "EN" },
}

const LOCALE_KEY = "excited_iam_locale"

function initialLocale(): Locale {
	if (typeof window === "undefined") return DEFAULT_LOCALE
	const stored = window.localStorage.getItem(LOCALE_KEY)
	return isLocale(stored) ? stored : DEFAULT_LOCALE
}

/** Translator hook with a persisted EN/TH choice. */
export function useTranslator(): { t: Translator["t"]; locale: Locale; toggleLocale: () => void } {
	const [locale, setLocale] = useState<Locale>(initialLocale)

	useEffect(() => {
		if (typeof document !== "undefined") document.documentElement.lang = locale
	}, [locale])

	const toggleLocale = useCallback(() => {
		setLocale((current) => {
			const next: Locale = current === "en" ? "th" : "en"
			try {
				window.localStorage.setItem(LOCALE_KEY, next)
			} catch {
				// Storage is optional; the page still switches for this session.
			}
			return next
		})
	}, [])

	const translator = createTranslator({ en: DICTIONARY, th: DICTIONARY }, locale)
	return { t: translator.t, locale, toggleLocale }
}
