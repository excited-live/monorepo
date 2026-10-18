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
	"settings.dataPortability": { en: "Data Backup & Portability", th: "สำรองและกู้คืนข้อมูล" },
	"settings.exportJson": { en: "Export Data to JSON", th: "ส่งออกข้อมูลเป็น JSON" },
	"settings.importJson": { en: "Import Data from JSON", th: "นำเข้าข้อมูลจาก JSON" },
	"settings.resetSeed": { en: "Reset All to Seed Baseline", th: "รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น" },
	"settings.cloudSync": { en: "Sync with Cloud BFF", th: "ซิงค์กับคลาวด์ BFF" },
	"settings.syncing": { en: "Syncing Cloud...", th: "กำลังซิงค์คลาวด์..." },
	"settings.synced": { en: "✓ Synced with Cloud", th: "✓ ซิงค์กับคลาวด์สำเร็จ" },
	"settings.syncFailed": { en: "✕ Sync Failed (Saved Locally)", th: "✕ ซิงค์ไม่สำเร็จ (บันทึกในเครื่องแล้ว)" },
	"settings.signOut": { en: "Sign Out", th: "ออกจากระบบ" },
	"settings.signIn": { en: "Sign In / Cloud Account", th: "เข้าสู่ระบบ / บัญชีคลาวด์" },
	"settings.verified": { en: "Account verified", th: "ยืนยันบัญชีแล้ว" },
	"settings.localDevice": { en: "Local device", th: "อุปกรณ์นี้ (Local)" },

	// Common
	"common.edit": { en: "Edit", th: "แก้ไข" },
	"common.delete": { en: "Delete", th: "ลบ" },
	"common.cancel": { en: "Cancel", th: "ยกเลิก" },
	"common.save": { en: "Save", th: "บันทึก" },
	"common.active": { en: "Active", th: "ใช้งานอยู่" },
	"common.inactive": { en: "Inactive", th: "ไม่ใช้งาน" },
};
