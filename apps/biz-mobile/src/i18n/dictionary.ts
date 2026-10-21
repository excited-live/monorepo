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

	// Common
	"common.edit": { en: "Edit", th: "แก้ไข" },
	"common.delete": { en: "Delete", th: "ลบ" },
	"common.cancel": { en: "Cancel", th: "ยกเลิก" },
	"common.save": { en: "Save", th: "บันทึก" },
	"common.active": { en: "Active", th: "ใช้งานอยู่" },
	"common.inactive": { en: "Inactive", th: "ไม่ใช้งาน" },
};
