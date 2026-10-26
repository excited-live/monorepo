import type { Dictionary } from "@excited-live/i18n";

// Mobile dictionary. Keys are stable IDs ("area.name"), values are { en, th } with EN first.
// Add a key here in the same change that consumes it; never key logic off rendered text.
export const strings: Dictionary = {
	// Navigation Tabs & Dock
	"tab.home": { en: "Home", th: "หน้าหลัก" },
	"tab.businessDetail": { en: "Business Detail", th: "รายละเอียดธุรกิจ" },
	"tab.personalDetail": { en: "Personal Detail", th: "รายละเอียดส่วนตัว" },
	"tab.settings": { en: "Settings", th: "ตั้งค่า" },
	"nav.home": { en: "Home", th: "หน้าแรก" },
	"nav.personal": { en: "Personal", th: "ส่วนตัว" },
	"nav.business": { en: "Business", th: "ธุรกิจ" },
	"nav.settings": { en: "Settings", th: "ตั้งค่า" },

	// Subtabs
	"subtab.income": { en: "Income", th: "รายรับ" },
	"subtab.expense": { en: "Expense", th: "รายจ่าย" },
	"subtab.assets": { en: "Assets", th: "สินทรัพย์" },
	"subtab.capital": { en: "Capital", th: "เงินทุน" },
	"subtab.liability": { en: "Liability", th: "หนี้สิน" },
	"subtab.ledger": { en: "Ledger", th: "บัญชีแยกประเภท" },

	// Hero Card
	"hero.wealth": { en: "Wealth", th: "ความมั่งคั่ง" },
	"hero.personalWealth": { en: "Personal Wealth", th: "ความมั่งคั่งส่วนตัว" },
	"hero.bookValue": { en: "Book Value", th: "มูลค่าตามบัญชี" },
	"hero.eomHint": { en: "( ) = end of month value", th: "( ) = มูลค่าสิ้นเดือน" },
	"hero.eomBadge": { en: "End of Month", th: "สิ้นเดือน" },
	"hero.tapToFlip": { en: "Tap to flip", th: "แตะเพื่อพลิก" },
	"hero.liquid": { en: "Liquid", th: "เงินสดคล่อง" },
	"hero.gear": { en: "Gear", th: "อุปกรณ์" },
	"hero.income": { en: "Income", th: "รายรับ" },
	"hero.expense": { en: "Expense", th: "รายจ่าย" },
	"hero.asset": { en: "Asset", th: "สินทรัพย์" },
	"hero.totalIncome": { en: "Income", th: "รายรับ" },
	"hero.totalExpense": { en: "Expense", th: "รายจ่าย" },
	"hero.totalAsset": { en: "Asset", th: "สินทรัพย์" },
	"hero.liability": { en: "Liability", th: "หนี้สิน" },
	"hero.runway": { en: "Runway", th: "รันเวย์" },
	"hero.totalCapital": { en: "Capital", th: "เงินทุน" },
	"hero.capitalDeployed": { en: "Capital Deployed", th: "เงินทุนที่ลง" },
	"hero.runwayMos": { en: "{count} mos runway", th: "รันเวย์ {count} เดือน" },
	"hero.defaultAlive": { en: "⚡ Default Alive", th: "⚡ อยู่รอดได้อย่างต่อเนื่อง" },

	// Ledger View
	"ledger.title": { en: "Monthly Ledger", th: "บัญชีแยกประเภทรายเดือน" },
	"ledger.actions": { en: "{count} Actions in {month}", th: "{count} รายการในเดือน {month}" },
	"ledger.inflow": { en: "Inflows", th: "เงินเข้า" },
	"ledger.outflow": { en: "Cash Outflow", th: "เงินออก" },
	"ledger.depreciation": { en: "Depreciation", th: "ค่าเสื่อมราคา" },
	"ledger.netCashFlow": { en: "Net Cash Flow", th: "กระแสเงินสดสุทธิ" },
	"ledger.empty": { en: "No recorded transactions for this month.", th: "ไม่มีรายการธุรกรรมในเดือนนี้" },

	// Buttons & Actions
	"action.addBusiness": { en: "+ Add Business", th: "+ เพิ่มธุรกิจ" },
	"action.moveCapital": { en: "+ Move Capital", th: "+ ย้ายเงินทุน" },
	"action.injectCapital": { en: "+ Inject Capital", th: "+ เติมเงินทุน" },
	"action.addIncome": { en: "+ Add Income", th: "+ เพิ่มรายได้" },
	"action.addExpense": { en: "+ Add Expense", th: "+ เพิ่มรายจ่าย" },
	"action.addAsset": { en: "+ Add Asset", th: "+ เพิ่มสินทรัพย์" },
	"action.addLiability": { en: "+ Add Liability", th: "+ เพิ่มหนี้สิน" },
	"action.registerLiability": { en: "+ Register Debt", th: "+ บันทึกหนี้สิน" },
	"action.adjustCash": { en: "Adjust Balance", th: "ปรับยอดเงินสด" },

	// Sections
	"section.entities": { en: "Entities", th: "ธุรกิจและบุคคล" },
	"section.capitalTransfers": { en: "Capital Transfers", th: "ประวัติการโอนเงินทุน" },
	"section.operationalInflows": { en: "Operational Inflows", th: "รายรับจากการดำเนินงาน" },
	"section.recurringOutflows": { en: "Recurring Outflows", th: "รายจ่ายประจำ" },
	"section.assetsAndCash": { en: "Assets & Cash", th: "สินทรัพย์และเงินสด" },
	"section.liquidReserves": { en: "Cash & Liquid Reserves", th: "เงินสดสำรองและเงินฝาก" },
	"section.physicalGear": { en: "Hardware & Gear Assets", th: "อุปกรณ์และเครื่องมือทำงาน" },
	"section.liabilities": { en: "Debts & Liabilities", th: "ภาระหนี้สินและการผ่อนชำระ" },

	// Home View Labels
	"home.consolidated": { en: "Consolidated Wealth", th: "ความมั่งคั่งรวมทั้งหมด" },
	"home.personal": { en: "Personal", th: "ส่วนตัว" },
	"home.personalWealth": { en: "Personal Wealth", th: "ความมั่งคั่งส่วนตัว" },
	"home.businessTreasury": { en: "Business Treasury", th: "เงินกองคลังธุรกิจ" },
	"home.totalHoldings": { en: "Total Holdings", th: "ทรัพย์สินรวมทั้งหมด" },
	"home.currentCareer": { en: "Current Career", th: "อาชีพปัจจุบัน" },
	"home.addCareer": { en: "Add Career Income", th: "เพิ่มรายได้จากอาชีพ" },
	"home.businesses": { en: "Ventures & Businesses", th: "ธุรกิจและการลงทุน" },
	"home.noBusinesses": { en: "No businesses created yet.", th: "ยังไม่มีธุรกิจที่สร้างไว้" },
	"home.activeSubscriptions": { en: "Active Subscriptions", th: "การสมัครสมาชิกที่ใช้งานอยู่" },
	"home.noSubscriptions": { en: "No subscriptions tracked.", th: "ไม่มีการสมัครสมาชิกที่ติดตามอยู่" },

	// Settings
	"settings.title": { en: "Settings & Configuration", th: "การตั้งค่าระบบ" },
	"settings.profile": { en: "Solopreneur Profile", th: "ข้อมูลส่วนตัว" },
	"settings.language": { en: "Language / ภาษา", th: "ภาษา / Language" },
	"settings.resetSeed": { en: "Reset All to Seed Baseline", th: "รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น" },
	"settings.signOut": { en: "Sign Out", th: "ออกจากระบบ" },
	"settings.signIn": { en: "Sign In / Cloud Account", th: "เข้าสู่ระบบ / บัญชีคลาวด์" },
	"settings.verified": { en: "Account verified", th: "ยืนยันบัญชีแล้ว" },
	"settings.localDevice": { en: "Local device", th: "อุปกรณ์นี้ (Local)" },
	"settings.connectedAgents": { en: "Connected agents", th: "เอเจนต์ที่เชื่อมต่อ" },
	"settings.agentKeys.empty": {
		en: "No agents connected yet. Set one up from Home.",
		th: "ยังไม่ได้เชื่อมต่อเอเจนต์ ตั้งค่าจากหน้าหลักได้เลย",
	},
	"settings.agentKeys.loading": { en: "Loading agents…", th: "กำลังโหลดเอเจนต์…" },
	"settings.agentKeys.error": {
		en: "Couldn't load connected agents.",
		th: "โหลดเอเจนต์ที่เชื่อมต่อไม่สำเร็จ",
	},
	"settings.agentKeys.created": { en: "Created {date}", th: "สร้างเมื่อ {date}" },
	"settings.agentKeys.lastUsed": { en: "Last used {date}", th: "ใช้ล่าสุด {date}" },
	"settings.agentKeys.neverUsed": { en: "Never used", th: "ยังไม่เคยใช้" },
	"settings.agentKeys.unknownAgent": { en: "Unknown agent", th: "ไม่ทราบเอเจนต์" },
	"settings.agentKeys.expires": { en: "Expires {date}", th: "หมดอายุ {date}" },
	"settings.agentKeys.revoke": { en: "Revoke", th: "ยกเลิก" },
	"settings.agentKeys.revokeTitle": { en: "Revoke this key?", th: "ยกเลิกคีย์นี้?" },
	"settings.agentKeys.revokeBody": {
		en: "Your agent loses access immediately.",
		th: "เอเจนต์ของคุณจะเข้าใช้งานไม่ได้ทันที",
	},
	"settings.agentKeys.revokeConfirm": { en: "Revoke key", th: "ยกเลิกคีย์" },

	// Onboarding checklist
	"onboarding.status.done": { en: "Done already", th: "ทำแล้ว" },
	"onboarding.status.upNext": { en: "Up next", th: "ขั้นถัดไป" },
	"onboarding.status.skipped": { en: "Skipped", th: "ข้ามไว้ก่อน" },
	"onboarding.status.pending": { en: "Pending", th: "รอดำเนินการ" },
	"onboarding.action.done": { en: "Done", th: "เสร็จแล้ว" },
	"onboarding.action.skip": { en: "Skip for now", th: "ข้ามไปก่อน" },
	"onboarding.action.setupNow": { en: "Set up now", th: "ตั้งค่าตอนนี้" },
	"onboarding.action.add": { en: "Add", th: "เพิ่ม" },
	"onboarding.optional": { en: "Optional", th: "ไม่บังคับ" },
	"onboarding.hint.addFirst": {
		en: "Add at least one entry to continue",
		th: "เพิ่มอย่างน้อยหนึ่งรายการเพื่อดำเนินการต่อ",
	},
	"onboarding.empty": { en: "No entries yet", th: "ยังไม่มีรายการ" },

	// Onboarding method chooser
	"onboarding.method.title": { en: "Let's get started", th: "เริ่มกันเลย" },
	"onboarding.method.agent": {
		en: "Set up with your AI agent",
		th: "ตั้งค่าด้วย AI เอเจนต์ของคุณ",
	},
	"onboarding.method.agentHint": {
		en: "Tell your agent about your money. It fills everything in.",
		th: "เล่าเรื่องเงินของคุณให้เอเจนต์ฟัง แล้วมันจะกรอกให้ทั้งหมด",
	},
	"onboarding.method.recommended": { en: "Recommended", th: "แนะนำ" },
	"onboarding.method.manual": { en: "Set up manually", th: "ตั้งค่าเอง" },
	"onboarding.method.manualHint": {
		en: "Fill in each step yourself.",
		th: "กรอกเองทีละขั้นตอน",
	},

	// Agent onboarding
	"onboarding.agent.title": { en: "Set up with your agent", th: "ตั้งค่าผ่านเอเจนต์" },
	"onboarding.agent.pickAgent": { en: "Pick your agent", th: "เลือกเอเจนต์ของคุณ" },
	"onboarding.agent.more": { en: "More", th: "เพิ่มเติม" },
	"onboarding.agent.moreTitle": { en: "All agents", th: "เอเจนต์ทั้งหมด" },
	"onboarding.agent.auth": { en: "Sign-in method", th: "วิธีเชื่อมต่อ" },
	"onboarding.agent.auth.apiKey": { en: "API key", th: "API key" },
	"onboarding.agent.auth.oauth": { en: "Sign-in link", th: "ลิงก์เข้าสู่ระบบ" },
	"onboarding.agent.auth.device": { en: "Device link", th: "ลิงก์อุปกรณ์" },
	"onboarding.agent.generateKey": { en: "Generate key", th: "สร้างคีย์" },
	"onboarding.agent.regenerateKey": { en: "Generate a new key", th: "สร้างคีย์ใหม่" },
	"onboarding.agent.generating": { en: "Generating…", th: "กำลังสร้าง…" },
	"onboarding.agent.keyTitle": { en: "Your API key", th: "API key ของคุณ" },
	"onboarding.agent.keyOnce": {
		en: "Shown once. Anyone with this key can edit your books. Revoke anytime in Settings.",
		th: "แสดงแค่ครั้งเดียว ใครมีคีย์นี้ก็แก้บัญชีคุณได้ ยกเลิกได้ทุกเมื่อในตั้งค่า",
	},
	"onboarding.agent.keyRegenerateNote": {
		en: "Generating a new key does not revoke the old one. Revoke it in Settings.",
		th: "สร้างคีย์ใหม่ไม่ได้ยกเลิกคีย์เก่า ยกเลิกได้ในตั้งค่า",
	},
	"onboarding.agent.keyError": {
		en: "Couldn't create a key. Try again.",
		th: "สร้างคีย์ไม่สำเร็จ ลองอีกครั้ง",
	},
	"onboarding.agent.testNoKey": {
		en: "Test environment: no key needed.",
		th: "โหมดทดสอบ: ไม่ต้องใช้คีย์ก็ได้",
	},
	"onboarding.agent.promptTitle": { en: "Prompt", th: "พรอมป์ต์" },
	"onboarding.agent.copy": { en: "Copy", th: "คัดลอก" },
	"onboarding.agent.copied": { en: "Copied", th: "คัดลอกแล้ว" },
	"onboarding.agent.copyFailed": {
		en: "Copy failed. Select the text and copy it.",
		th: "คัดลอกไม่สำเร็จ เลือกข้อความแล้วคัดลอกเอง",
	},
	"onboarding.agent.connectorUrl": { en: "Connector URL", th: "URL ของคอนเนกเตอร์" },
	"onboarding.agent.chatSteps": { en: "Add it to your chat app", th: "เพิ่มในแอปแชตของคุณ" },
	"onboarding.agent.signInUnavailable": {
		en: "Sign-in link not available in this environment.",
		th: "ลิงก์เข้าสู่ระบบใช้ไม่ได้ในสภาพแวดล้อมนี้",
	},
	"onboarding.agent.deviceHint": {
		en: "Send this prompt to your cloud agent. It will send you a link to approve.",
		th: "ส่งพรอมป์ต์นี้ให้เอเจนต์บนคลาวด์ แล้วมันจะส่งลิงก์มาให้กดอนุมัติ",
	},
	"onboarding.agent.waiting": { en: "Waiting for your agent…", th: "รอเอเจนต์ของคุณอยู่…" },
	"onboarding.agent.working": { en: "Your agent is working…", th: "เอเจนต์กำลังทำอยู่…" },
	"onboarding.agent.allSet": { en: "All set", th: "เรียบร้อยแล้ว" },
	"onboarding.agent.progress": { en: "Progress", th: "ความคืบหน้า" },
	"onboarding.agent.useManual": { en: "Set up manually instead", th: "ตั้งค่าเองแทน" },
	"onboarding.agent.useAgent": { en: "Use an AI agent instead", th: "ใช้ AI เอเจนต์แทน" },
	"onboarding.agent.kind.coding": { en: "Coding agent", th: "เอเจนต์เขียนโค้ด" },
	"onboarding.agent.kind.chat": { en: "Chat app", th: "แอปแชต" },
	"onboarding.agent.kind.cloud": { en: "Cloud agent", th: "เอเจนต์บนคลาวด์" },

	// Chat connector steps
	"agent.setup.claude.1": {
		en: "Open Settings → Connectors → Add custom connector.",
		th: "เปิด Settings → Connectors → Add custom connector",
	},
	"agent.setup.claude.2": {
		en: "Paste the connector URL below.",
		th: "วาง URL ของคอนเนกเตอร์ด้านล่าง",
	},
	"agent.setup.claude.3": {
		en: "Tap Connect, then sign in to excited.live.",
		th: "กด Connect แล้วเข้าสู่ระบบ excited.live",
	},
	"agent.setup.chatgpt.1": {
		en: "Open Settings → Connectors (or Apps).",
		th: "เปิด Settings → Connectors (หรือ Apps)",
	},
	"agent.setup.chatgpt.2": {
		en: "Turn on developer mode if you need to add a custom connector.",
		th: "เปิด developer mode ถ้าต้องเพิ่มคอนเนกเตอร์เอง",
	},
	"agent.setup.chatgpt.3": {
		en: "Add the connector URL below, then sign in.",
		th: "เพิ่ม URL ของคอนเนกเตอร์ด้านล่าง แล้วเข้าสู่ระบบ",
	},

	// Week-one loop (#102) — S1 week strip. Copy is the design deck of record:
	// OpenDesign `week-one-loop/copy/week-one-loop-strings-en-th.md`.
	"week.strip.title": { en: "This week", th: "สัปดาห์นี้" },
	"week.strip.seeWeek": { en: "See the week", th: "ดูทั้งสัปดาห์" },
	"week.strip.fresh_one": {
		en: "You've checked in 1 day this week.",
		th: "คุณเช็คอินแล้ว 1 วันในสัปดาห์นี้",
	},
	"week.strip.fresh_other": {
		en: "You've checked in {n} days this week.",
		th: "คุณเช็คอินแล้ว {n} วันในสัปดาห์นี้",
	},
	"week.strip.stale": { en: "Your week went quiet {n} days ago.", th: "สัปดาห์ของคุณเงียบไป {n} วันที่แล้ว" },
	"week.strip.empty": { en: "Your week starts today.", th: "สัปดาห์ของคุณเริ่มวันนี้" },
	"week.strip.emptyBody": {
		en: "Nothing here yet. Today counts as day one.",
		th: "ยังไม่มีข้อมูลตรงนี้ วันนี้นับเป็นวันแรก",
	},
	"week.strip.cta.fresh": { en: "Add today's spending", th: "บันทึกรายจ่ายวันนี้" },
	"week.strip.cta.stale": {
		en: "Pick up where you left off",
		th: "กลับมาเริ่มต่อจากที่ค้างไว้",
	},
	"week.strip.cta.empty": { en: "Add one expense", th: "บันทึกรายจ่ายหนึ่งรายการ" },
	"week.strip.a11y.label": { en: "Your week", th: "สัปดาห์ของคุณ" },
	"week.strip.a11y.days": { en: "Days with a check-in", th: "วันที่เช็คอินแล้ว" },
	"week.strip.a11y.day": { en: "{day}: {state}", th: "{day}: {state}" },
	// Mon → Sun, one key per day: never a space-separated string to split at render
	// (#168). Thai bare initials collide — อ is Tue and Sun, พ is Wed and Thu — so
	// the strip uses the abbreviated forms (จ. อ. พ. พฤ. ศ. ส. อา.) and the full
	// name in `aria-label`, where a screen reader hears the day without ambiguity.
	"week.strip.dayShort.mon": { en: "M", th: "จ." },
	"week.strip.dayShort.tue": { en: "T", th: "อ." },
	"week.strip.dayShort.wed": { en: "W", th: "พ." },
	"week.strip.dayShort.thu": { en: "T", th: "พฤ." },
	"week.strip.dayShort.fri": { en: "F", th: "ศ." },
	"week.strip.dayShort.sat": { en: "S", th: "ส." },
	"week.strip.dayShort.sun": { en: "S", th: "อา." },
	"week.strip.dayFull.mon": { en: "Monday", th: "วันจันทร์" },
	"week.strip.dayFull.tue": { en: "Tuesday", th: "วันอังคาร" },
	"week.strip.dayFull.wed": { en: "Wednesday", th: "วันพุธ" },
	"week.strip.dayFull.thu": { en: "Thursday", th: "วันพฤหัสบดี" },
	"week.strip.dayFull.fri": { en: "Friday", th: "วันศุกร์" },
	"week.strip.dayFull.sat": { en: "Saturday", th: "วันเสาร์" },
	"week.strip.dayFull.sun": { en: "Sunday", th: "วันอาทิตย์" },
	"week.strip.dayState.done": { en: "checked in", th: "เช็คอินแล้ว" },
	"week.strip.dayState.quiet": { en: "quiet", th: "เงียบ" },
	"week.strip.dayState.today": { en: "today", th: "วันนี้" },
	"week.strip.dayState.future": { en: "not yet", th: "ยังไม่ถึง" },

	// Confidence bands. These words live here and nowhere else: no surface spells
	// a band, and confidence is never a digit (patterns/decision-suggestion.md).
	"confidence.high": { en: "High", th: "สูง" },
	"confidence.medium": { en: "Medium", th: "ปานกลาง" },
	"confidence.low": { en: "Low", th: "ต่ำ" },
	"confidence.a11y": { en: "Confidence: {band}", th: "ความมั่นใจ: {band}" },
	"confidence.hedge.high": { en: "We think this holds.", th: "เราคิดว่าแบบนี้ใช้ได้" },
	"confidence.hedge.medium": {
		en: "We think this is likely — the size is less certain.",
		th: "เราคิดว่าเป็นไปได้ — แต่ขนาดยังไม่แน่",
	},
	"confidence.hedge.low": {
		en: "We're not sure yet — which is closer?",
		th: "เรายังไม่แน่ใจ — อันไหนใกล้กว่ากัน?",
	},

	// S2 morning projection
	"projection.title": { en: "We think {period}", th: "เราคิดว่า{period}" },
	"projection.period.week": { en: "this week", th: "สัปดาห์นี้" },
	"projection.empty.title": { en: "Your week", th: "สัปดาห์ของคุณ" },
	"projection.empty.body": {
		en: "One income figure and we can show you your week.",
		th: "ใส่รายได้หนึ่งตัวเลข แล้วเราจะแสดงสัปดาห์ของคุณให้ดู",
	},
	"projection.empty.note": {
		en: "Until then this stays empty on purpose — we'd rather show you nothing than a number we made up.",
		th: "จนกว่าจะใส่ เราตั้งใจให้ว่างไว้ — เรายอมให้คุณเห็นความว่าง ดีกว่าให้เห็นตัวเลขที่เราปั้นขึ้นมาเอง",
	},
	"projection.empty.cta": { en: "Add your income", th: "เพิ่มรายได้ของคุณ" },
	"projection.why": { en: "Why: {why}.", th: "เหตุผล: {why}" },
	"projection.depth": {
		en: "based on {n} days of your spending",
		th: "จากข้อมูลการใช้จ่าย {n} วันของคุณ",
	},
	"projection.stale": {
		en: "This is from {n} days ago. Add one recent expense and we'll refresh it.",
		th: "ข้อมูลนี้มาจาก {n} วันที่แล้ว บันทึกรายจ่ายล่าสุดหนึ่งรายการ แล้วเราจะอัปเดตให้",
	},
	"projection.action.math": { en: "Show the math", th: "ดูวิธีคำนวณ" },
	"projection.action.changes": { en: "What would change it", th: "อะไรจะทำให้เปลี่ยน" },
	"projection.a11y.label": { en: "Weekly projection", th: "ประมาณการรายสัปดาห์" },

	// S3 decision card — one advisory card a day at most.
	"decision.a11y.label": { en: "Suggestion", th: "ข้อเสนอ" },
	"decision.eyebrow.suggestion": { en: "Suggestion", th: "ข้อเสนอ" },
	"decision.eyebrow.accepted": { en: "Accepted", th: "ยอมรับแล้ว" },
	"decision.eyebrow.dismissed": { en: "Dismissed", th: "ปิดไว้" },
	"decision.eyebrow.updated": { en: "Updated", th: "อัปเดตแล้ว" },
	"decision.why": { en: "Why: {why}.", th: "เหตุผล: {why}" },
	"decision.updatedBecause": {
		en: "Updated because you changed: {reason}.",
		th: "อัปเดตเพราะคุณแก้: {reason}",
	},
	"decision.accept": { en: "Accept", th: "ยอมรับ" },
	"decision.adjust": { en: "Not quite", th: "ยังไม่ตรง" },
	"decision.dismiss": { en: "Dismiss", th: "ปิดไว้" },
	"decision.undo": { en: "Undo", th: "เลิกทำ" },
	"decision.showMath": { en: "Show the math", th: "ดูวิธีคำนวณ" },
	"decision.whatChanges": { en: "What would change it", th: "อะไรจะทำให้เปลี่ยน" },
	"decision.receipt.accepted": { en: "You accepted this.", th: "คุณยอมรับข้อนี้แล้ว" },
	"decision.receipt.acceptedOn": {
		en: "You accepted this on {date}.",
		th: "คุณยอมรับข้อนี้เมื่อ {date}",
	},
	"decision.receipt.dismissed": {
		en: "Dismissed — we won't bring this up again for a while.",
		th: "ปิดไว้ — เราจะไม่ชวนเรื่องนี้อีกสักพัก",
	},

	// S4 evening check-in
	"checkIn.title": {
		en: "Today we think you spent about ฿{amount} on {label}.",
		th: "วันนี้เราคิดว่าคุณใช้ไปประมาณ ฿{amount} กับ{label}",
	},
	"checkIn.meta": { en: "Tonight · 30 seconds", th: "คืนนี้ · 30 วินาที" },
	"checkIn.step": { en: "1 of 1", th: "1 จาก 1" },
	"checkIn.chip.same": { en: "About the same", th: "ประมาณเดิม" },
	"checkIn.chip.less": { en: "Less", th: "น้อยกว่า" },
	"checkIn.chip.more": { en: "More", th: "มากกว่า" },
	"checkIn.edit": { en: "Enter the exact amount", th: "กรอกจำนวนที่แน่นอน" },
	"checkIn.confirm": { en: "That's right", th: "ถูกต้อง" },
	"checkIn.saving": { en: "Saving…", th: "กำลังบันทึก…" },
	"checkIn.skip": { en: "Not tonight", th: "คืนนี้ไม่สะดวก" },
	"checkIn.saved": { en: "Saved", th: "บันทึกแล้ว" },
	"checkIn.savedBody": {
		en: "That's your day logged. See you tomorrow morning.",
		th: "บันทึกวันนี้เรียบร้อย เจอกันพรุ่งนี้เช้า",
	},
	"checkIn.undo": { en: "Undo", th: "เลิกทำ" },
	"checkIn.a11y.label": { en: "Daily check-in", th: "เช็คอินประจำวัน" },
	"checkIn.a11y.saved": { en: "Check-in saved", th: "บันทึกเช็คอินแล้ว" },

	// S5 day-7 recap
	"recap.title": { en: "Your first week", th: "สัปดาห์แรกของคุณ" },
	"recap.verdict.onTarget": { en: "We were close this week.", th: "สัปดาห์นี้เราใกล้เคียง" },
	"recap.verdict.over": {
		en: "We were off — you spent about ฿{gap} more than we thought.",
		th: "เราคลาดไป — คุณใช้มากกว่าที่เราคิดไว้ประมาณ ฿{gap}",
	},
	"recap.verdict.under": {
		en: "We were off — you spent about ฿{gap} less than we thought.",
		th: "เราคลาดไป — คุณใช้น้อยกว่าที่เราคิดไว้ประมาณ ฿{gap}",
	},
	"recap.col.predicted": { en: "We thought", th: "เราคิดว่า" },
	"recap.col.actual": { en: "It was", th: "จริงคือ" },
	"recap.whyMissed": { en: "Why we missed: {why}.", th: "ทำไมเราถึงคลาด: {why}" },
	"recap.checkIns": { en: "{n} of {total} days checked in", th: "เช็คอิน {n} จาก {total} วัน" },
	"recap.noStreaks": { en: "no streaks, no scores", th: "ไม่มีสตรีค ไม่มีคะแนน" },
	"recap.nextLabel": { en: "One thing for next week", th: "หนึ่งอย่างสำหรับสัปดาห์หน้า" },
	"recap.notNow": { en: "Not now", th: "ไว้ก่อน" },
	"recap.share": { en: "Save this week as a PDF", th: "บันทึกสัปดาห์นี้เป็น PDF" },
	"recap.a11y.label": { en: "Your week in review", th: "สรุปสัปดาห์ของคุณ" },

	// Common
	"common.edit": { en: "Edit", th: "แก้ไข" },
	"common.delete": { en: "Delete", th: "ลบ" },
	"common.cancel": { en: "Cancel", th: "ยกเลิก" },
	"common.save": { en: "Save", th: "บันทึก" },
	"common.active": { en: "Active", th: "ใช้งานอยู่" },
	"common.inactive": { en: "Inactive", th: "ไม่ใช้งาน" },
};
