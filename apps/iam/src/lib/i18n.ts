import { DEFAULT_LOCALE, createTranslator, isLocale, type Dictionary, type Locale, type Translator } from "@excited-live/i18n"
import { useCallback, useMemo, useSyncExternalStore } from "react"

/**
 * Bilingual strings for the hub.
 *
 * Every string the marketing Home, the status band and the MCP Agents page add
 * is here as `{ en, th }`, English first. The older auth and console strings
 * stay in the dictionary too: they were already bilingual, and moving a page to
 * a new route is not a reason to drop its Thai copy.
 *
 * Reuses `@excited-live/i18n` so the same `{ name }` interpolation and EN
 * fallback apply as in apps/webapp.
 */
const DICTIONARY: Dictionary = {
	// ---------- shell / navigation -----------------------------------------
	"nav.home": { en: "Home", th: "หน้าแรก" },
	"nav.mcp": { en: "MCP Agents", th: "เอเจนต์ MCP" },
	"nav.tokens": { en: "Scoped Keys", th: "คีย์ที่กำหนดขอบเขต" },
	"nav.data": { en: "API Playground", th: "ทดลอง API" },
	"nav.sections": { en: "Sections", th: "ส่วนต่าง ๆ" },
	"nav.locale": { en: "ไทย", th: "EN" },
	"nav.switchLocale": { en: "Switch language to Thai", th: "เปลี่ยนภาษาเป็นอังกฤษ" },

	// ---------- status band (#92) ------------------------------------------
	"band.api_ok": { en: "API ok", th: "API ปกติ" },
	"band.api_degraded": { en: "API degraded", th: "API ทำงานช้าลง" },
	"band.api_down": { en: "API down", th: "API ขัดข้อง" },
	"band.api_unknown": { en: "API ?", th: "API ?" },
	"band.onboarding": { en: "{n}/6 · next: {step}", th: "{n}/6 · ต่อไป: {step}" },
	"band.account": { en: "Account", th: "บัญชี" },
	"band.onboarding_title": { en: "Onboarding", th: "การเริ่มใช้งาน" },
	"band.api_title": { en: "API", th: "API" },
	"band.continue": { en: "Continue", th: "ทำต่อ" },
	"band.signout": { en: "Sign out", th: "ออกจากระบบ" },
	"band.resume": { en: "Resume where you stopped", th: "ทำต่อจากที่ค้างไว้" },
	"band.steps": { en: "{n} of 6 steps", th: "{n} จาก 6 ขั้นตอน" },
	"band.next": { en: "Next: {step}", th: "ต่อไป: {step}" },
	"band.checked": { en: "checked just now", th: "ตรวจสอบเมื่อสักครู่" },
	"band.error": { en: "Could not load progress: {message}", th: "โหลดความคืบหน้าไม่ได้: {message}" },
	"band.expand": { en: "Show account status", th: "แสดงสถานะบัญชี" },
	"band.collapse": { en: "Hide account status", th: "ซ่อนสถานะบัญชี" },
	"step.create_account": { en: "Create account", th: "สร้างบัญชี" },
	"step.add_business": { en: "Add business", th: "เพิ่มธุรกิจ" },
	"step.assets_wallet": { en: "Wallet & assets", th: "กระเป๋าและทรัพย์สิน" },
	"step.add_liability": { en: "Add liability", th: "เพิ่มหนี้สิน" },
	"step.add_income": { en: "Add income", th: "เพิ่มรายรับ" },
	"step.add_expense": { en: "Add expense", th: "เพิ่มรายจ่าย" },

	// ---------- marketing Home (#91) ---------------------------------------
	"home.eyebrow": { en: "Android · Early access", th: "Android · เปิดให้ทดลองใช้" },
	"home.title": { en: "Your money, in your pocket.", th: "เงินของคุณ อยู่ในมือคุณ" },
	"home.body": {
		en: "Track cash, bills and runway on your phone — and let your agent keep the numbers current.",
		th: "ติดตามเงินสด บิล และรันเวย์บนมือถือ พร้อมให้เอเจนต์ช่วยอัปเดตตัวเลขให้เสมอ",
	},
	"home.cta.get": { en: "Get the Android app", th: "รับแอป Android" },
	"home.cta.gated": { en: "Android app — coming 31 Oct", th: "แอป Android — เปิดตัว 31 ต.ค." },
	"home.cta.create": { en: "Create an account", th: "สร้างบัญชี" },
	"home.cta.signin": { en: "Sign in", th: "เข้าสู่ระบบ" },
	"home.cta.mcp": { en: "Open MCP Agents", th: "เปิดเอเจนต์ MCP" },
	"home.greeting": { en: "Welcome back, {name}.", th: "ยินดีต้อนรับกลับ {name}" },
	"home.store.play": { en: "Google Play", th: "Google Play" },
	"home.store.playStatus": { en: "Coming 31 Oct", th: "เปิดตัว 31 ต.ค." },
	"home.store.apple": { en: "App Store", th: "App Store" },
	"home.store.appleStatus": { en: "Coming soon", th: "เร็ว ๆ นี้" },
	"home.store.heading": { en: "Get the app", th: "รับแอป" },
	"home.store.caption": { en: "The Android app is in early access. iOS follows after launch.", th: "แอป Android เปิดให้ทดลองใช้ก่อน iOS จะตามมาหลังเปิดตัว" },
	"home.cards.mcp.title": { en: "Connect your agent", th: "เชื่อมต่อเอเจนต์ของคุณ" },
	"home.cards.mcp.body": {
		en: "Claude, ChatGPT, Codex or Cursor — one MCP endpoint.",
		th: "Claude, ChatGPT, Codex หรือ Cursor — ปลายทาง MCP เดียว",
	},
	"home.cards.keys.title": { en: "Keys with limits", th: "คีย์ที่กำหนดขอบเขตได้" },
	"home.cards.keys.body": {
		en: "Give each agent only the permissions it needs.",
		th: "ให้สิทธิ์เอเจนต์เท่าที่จำเป็น",
	},
	"home.cards.data.title": { en: "See every response", th: "ดูทุกคำตอบ" },
	"home.cards.data.body": {
		en: "Run a tool and read the payload before you wire it in.",
		th: "ลองเรียกเครื่องมือและดูข้อมูลก่อนเชื่อมจริง",
	},
	"home.cards.os.title": { en: "Apache-2.0", th: "Apache-2.0" },
	"home.cards.os.body": { en: "Read the code that holds your numbers.", th: "อ่านโค้ดที่ดูแลตัวเลขของคุณ" },
	"home.open": { en: "Open {name}", th: "เปิด {name}" },
	"home.summary": {
		en: "Built for your agent and for you. No external investor, no ad tracking.",
		th: "สร้างมาเพื่อเอเจนต์และตัวคุณ ไม่มีนักลงทุนภายนอก ไม่มีโฆษณาติดตาม",
	},
	"home.footer.note": {
		en: "The 50-year web planner is being rebuilt and returns after launch.",
		th: "แพลนเนอร์ 50 ปีบนเว็บกำลังถูกออกแบบใหม่ จะกลับมาหลังเปิดตัว",
	},
	"footer.product": { en: "Product", th: "ผลิตภัณฑ์" },
	"footer.ecosystem": { en: "Ecosystem", th: "ระบบนิเวศ" },
	"footer.governance": { en: "Governance", th: "การกำกับดูแล" },
	"footer.docs": { en: "Documentation", th: "เอกสารประกอบ" },
	"footer.docsMcp": { en: "Connect your agent", th: "เชื่อมต่อเอเจนต์" },
	"footer.github": { en: "Source code", th: "ซอร์สโค้ด" },
	"footer.privacy": { en: "Privacy", th: "ความเป็นส่วนตัว" },
	"footer.terms": { en: "Terms", th: "ข้อกำหนด" },
	"footer.tagline": { en: "Financial planning for your agent and for you.", th: "การวางแผนการเงินสำหรับเอเจนต์และตัวคุณ" },

	// ---------- MCP Agents (#90 / #91) --------------------------------------
	"mcp.eyebrow": { en: "MCP Agents · {env}", th: "เอเจนต์ MCP · {env}" },
	"mcp.title": { en: "Wire an agent, then watch what it does.", th: "เชื่อมต่อเอเจนต์ แล้วดูว่าเอเจนต์ทำอะไร" },
	"mcp.lede": {
		en: "This hub mints their keys, shows the exact MCP configuration each client needs, and lets you replay any call the API serves.",
		th: "ศูนย์นี้สร้างคีย์ให้เอเจนต์ แสดงการตั้งค่า MCP ที่ไคลเอนต์แต่ละตัวต้องใช้ และให้คุณลองเรียกทุกคำขอที่ API ให้บริการ",
	},
	"mcp.openPlayground": { en: "Open the data playground →", th: "เปิด playground ข้อมูล →" },
	"mcp.manageKeys": { en: "Manage keys", th: "จัดการคีย์" },
	"mcp.registry.title": { en: "Tool registry", th: "ทะเบียนเครื่องมือ" },
	"mcp.registry.body": {
		en: "Read live from the MCP server with your session, so the list cannot drift from what an agent gets.",
		th: "อ่านสดจากเซิร์ฟเวอร์ MCP ด้วยเซสชันของคุณ รายการจึงไม่คลาดจากสิ่งที่เอเจนต์ได้รับ",
	},
	"mcp.registry.signin": {
		en: "Sign in to read the live tool registry.",
		th: "เข้าสู่ระบบเพื่ออ่านทะเบียนเครื่องมือสด",
	},
	"mcp.registry.loading": { en: "Reading the registry…", th: "กำลังอ่านทะเบียน…" },
	"mcp.registry.error": { en: "Could not read the registry: {message}", th: "อ่านทะเบียนไม่ได้: {message}" },
	"mcp.registry.count": { en: "{n} tools live", th: "{n} เครื่องมือที่ใช้งานได้" },
	"mcp.registry.retry": { en: "Retry", th: "ลองอีกครั้ง" },
	"mcp.fleet.note": {
		en: "Tool count comes from the server registry, not a per-key metric.",
		th: "จำนวนเครื่องมือมาจากทะเบียนเซิร์ฟเวอร์ ไม่ใช่ตัวชี้วัดรายคีย์",
	},

	// ---------- API Playground ---------------------------------------------
	"data.eyebrow": { en: "API Playground · interactive API", th: "ทดลอง API · เรียกใช้งานจริง" },
	"data.title": { en: "Every call, and what it returns.", th: "ทุกคำขอ และสิ่งที่ได้กลับมา" },
	"data.lede": {
		en: "The catalog is generated from the API's OpenAPI document, version {version}. Run a request against the single API and see the component an agent would get back — plus the exact cURL, package function and MCP tool call behind it.",
		th: "แคตตาล็อกสร้างจากเอกสาร OpenAPI ของ API เวอร์ชัน {version} เรียกคำขอจริงกับ API เดียว แล้วดูคอมโพเนนต์ที่เอเจนต์จะได้รับ พร้อม cURL ฟังก์ชันแพ็กเกจ และคำสั่งเครื่องมือ MCP ที่อยู่เบื้องหลัง",
	},

	// ---------- 404 ---------------------------------------------------------
	"notfound.title": { en: "No such page", th: "ไม่พบหน้านี้" },
	"notfound.body": {
		en: "The hub has four tabs: Home, MCP Agents, Scoped Keys and API Playground. Start from Home.",
		th: "ศูนย์นี้มีสี่แท็บ: หน้าแรก เอเจนต์ MCP คีย์ที่กำหนดขอบเขต และทดลอง API เริ่มจากหน้าแรก",
	},

	// ---------- auth (unchanged copy, moved into the shared dictionary) -----
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

type Listener = () => void

const listeners = new Set<Listener>()
let cachedLocale: Locale | undefined

function readLocale(): Locale {
	if (typeof window === "undefined") return DEFAULT_LOCALE
	try {
		const stored = window.localStorage.getItem(LOCALE_KEY)
		return isLocale(stored) ? stored : DEFAULT_LOCALE
	} catch {
		return DEFAULT_LOCALE
	}
}

/**
 * One locale for the whole app.
 *
 * Before #91 each `useTranslator()` call owned a private `useState`, so the
 * language pill in the auth card and any second surface could disagree. A tiny
 * external store keeps them in step and keeps the public hook shape unchanged.
 */
function getLocale(): Locale {
	if (cachedLocale === undefined) cachedLocale = readLocale()
	return cachedLocale
}

function setLocale(next: Locale): void {
	cachedLocale = next
	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem(LOCALE_KEY, next)
		} catch {
			// Storage is optional; the page still switches for this session.
		}
	}
	if (typeof document !== "undefined") document.documentElement.lang = next
	for (const listener of listeners) listener()
}

function subscribeLocale(listener: Listener): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function useLocale(): Locale {
	return useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE)
}

/** Translator hook with a persisted, app-wide EN/TH choice. */
export function useTranslator(): { t: Translator["t"]; locale: Locale; toggleLocale: () => void } {
	const locale = useLocale()
	const toggleLocale = useCallback(() => {
		setLocale(getLocale() === "en" ? "th" : "en")
	}, [])
	const translator = useMemo(() => createTranslator({ en: DICTIONARY, th: DICTIONARY }, locale), [locale])
	return { t: translator.t, locale, toggleLocale }
}
