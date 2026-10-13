/**
 * User-facing UI strings — one source of truth, bilingual { en, th } (EN first).
 * Keys are stable IDs; selection state uses keys, never text.
 */
import { createTranslator, type Dictionary, type Locale } from "@excited-live/i18n"

export const strings: Dictionary = {
	"app.title": { en: "excited.live — Plan the life you're excited to live", th: "excited.live — วางแผนชีวิตที่คุณตื่นเต้นจะใช้" },
	"app.description": {
		en: "Simulate your life plan — income, spending, tax and savings, projected in real numbers.",
		th: "จำลองแผนชีวิตของคุณ รายรับ ค่าใช้จ่าย ภาษี และการออม คำนวณเป็นตัวเลขจริง",
	},

	"nav.hello": { en: "Your plan, live", th: "แผนของคุณ สด ๆ" },
	"nav.synced": { en: "Numbers update as you type", th: "ตัวเลขอัปเดตทันทีที่แก้" },
	"nav.plan": { en: "Plan", th: "แผน" },
	"nav.settings": { en: "Settings", th: "ตั้งค่า" },
	"locale.toggle": { en: "Switch language", th: "เปลี่ยนภาษา" },
	"locale.en": { en: "EN", th: "EN" },
	"locale.th": { en: "ไทย", th: "ไทย" },
	"auth.signIn": { en: "Sign in", th: "เข้าสู่ระบบ" },
	"auth.signOut": { en: "Sign out", th: "ออกจากระบบ" },
	"auth.signInTitle": { en: "Sign in to excited.live", th: "เข้าสู่ระบบ excited.live" },
	"auth.signInSubtitle": {
		en: "Welcome back. Sign in to continue to your plan.",
		th: "ยินดีต้อนรับกลับ เข้าสู่ระบบเพื่อไปที่แผนของคุณ",
	},
	"auth.email": { en: "Email", th: "อีเมล" },
	"auth.password": { en: "Password", th: "รหัสผ่าน" },
	"auth.continueWithGoogle": { en: "Continue with Google", th: "ดำเนินการต่อด้วย Google" },
	"auth.error.invalidCredentials": {
		en: "Sign-in failed. Check your email and password.",
		th: "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง",
	},
	"auth.error.generic": { en: "Something went wrong. Please try again.", th: "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" },
	"auth.notConfigured": {
		en: "Sign-in is not available in this environment.",
		th: "การเข้าสู่ระบบไม่พร้อมใช้งานในสภาพแวดล้อมนี้",
	},
	"metric.netWorth": { en: "Net worth", th: "มูลค่าสุทธิ" },
	"metric.cashFlow": { en: "Cash flow", th: "กระแสเงินสด" },
	"period.all": { en: "All", th: "ทั้งหมด" },
	"chart.aria.netWorth": { en: "Net worth projection chart", th: "แผนภูมิมูลค่าสุทธิ" },
	"chart.aria.cashFlow": { en: "Cash flow projection chart", th: "แผนภูมิกระแสเงินสด" },
	"a11y.chartMetric": { en: "Chart metric", th: "ตัวชี้วัดของแผนภูมิ" },
	"a11y.chartPeriod": { en: "Chart period", th: "ช่วงเวลาของแผนภูมิ" },
	"a11y.financialSnapshot": { en: "Financial snapshot", th: "ภาพรวมการเงิน" },
	"a11y.mainNav": { en: "Main pages", th: "หน้าหลัก" },

	// US-110 — Monte Carlo market band
	"chart.band.caption": {
		en: "Shaded band: P10–P90 across {trials} market scenarios · {survival} of plans never run out",
		th: "แถบแรเงา: P10–P90 จาก {trials} สถานการณ์ตลาด · {survival} ของแผนที่เงินไม่หมดทาง",
	},
	"chart.band.unmet": {
		en: "worst case runs out {year}",
		th: "กรณีเลวร้ายที่สุด เงินไม่พอในปี {year}",
	},

	// Left column financial rows (engine-driven)
	"metric.netWorthValue": { en: "Net Worth", th: "มูลค่าสุทธิ" },
	"metric.changeInNetWorth": { en: "Change in Net Worth", th: "การเปลี่ยนแปลงมูลค่าสุทธิ" },
	"metric.liquidNetWorth": { en: "Liquid Net Worth", th: "มูลค่าสุทธิสภาพคล่อง" },
	"metric.withdrawals": { en: "Withdrawals", th: "เงินถอน" },
	"metric.withdrawalRate": { en: "Withdrawal Rate", th: "อัตราการถอน" },
	"metric.income": { en: "Income", th: "รายได้" },
	"metric.taxableIncome": { en: "Taxable Income", th: "รายได้สุทธิที่ต้องเสียภาษี" },
	"metric.taxes": { en: "Taxes", th: "ภาษี" },
	"metric.effectiveTaxRate": { en: "Effective Tax Rate", th: "อัตราภาษีเฉลี่ย" },
	"metric.spending": { en: "Spending", th: "การใช้จ่าย" },
	"metric.expenses": { en: "Expenses", th: "ค่าใช้จ่าย" },
	"metric.savingsRate": { en: "Savings Rate", th: "อัตราการออม" },
	"metric.taxBalance": { en: "Tax Balance", th: "ยอดภาษีคงค้าง" },

	// Right column — plan summary card
	"plan.actions": { en: "Plan", th: "แผน" },
	"plan.lastSyncedToday": { en: "Recomputed just now", th: "คำนวณใหม่เมื่อสักครู่" },

	// Engine answers (used by the chat replies)
	"info.retirement.left": { en: "{amount} left at {year}", th: "เหลือ {amount} ถึงปี {year}" },
	"info.retirement.runsOut": { en: "money runs out {year}", th: "เงินหมดปี {year}" },
	"info.runsOut.never": { en: "never", th: "ไม่หมด" },

	// Editor (inline section below the grid)
	"editor.heading": { en: "Plan inputs", th: "ตัวเลขของแผน" },
	"editor.desc": {
		en: "Everything here is editable — add rows for each income or expense, with start/end years and growth.",
		th: "แก้ได้ทุกช่อง เพิ่มแถวรายได้หรือรายจ่ายได้ พร้อมปีเริ่ม-จบ และการเติบโต",
	},

	// Sections
	"section.chart": { en: "Net worth over time", th: "มูลค่าสุทธิตลอดเวลา" },
	"section.summaryLong": { en: "Long term", th: "ระยะยาว" },
	"section.summaryThisYear": { en: "This year", th: "ปีนี้" },

	// Rows
	"incomes.heading": { en: "Income", th: "รายได้" },
	"expenses.heading": { en: "Expenses", th: "ค่าใช้จ่าย" },
	"row.label": { en: "Name", th: "ชื่อ" },
	"table.metric": { en: "Metric", th: "ตัวชี้วัด" },
	"table.value": { en: "Value", th: "มูลค่า" },
	"table.search": { en: "Search", th: "ค้นหา" },
	"table.wallet": { en: "Wallet", th: "กระเป๋า" },
	"row.period": { en: "Period", th: "ช่วงเวลา" },
	"row.amount": { en: "Amount (฿)", th: "จำนวน (บาท)" },
	"row.startYear": { en: "Start", th: "เริ่ม" },
	"row.endYear": { en: "End", th: "สิ้นสุด" },
	"row.growth": { en: "Growth", th: "เติบโต" },
	"growth.inflation": { en: "Inflation", th: "ตามเงินเฟ้อ" },
	"growth.fixed": { en: "Fixed", th: "คงที่" },
	"growth.override": { en: "Custom %", th: "กำหนดเอง %" },
	"row.growthRate": { en: "Growth %", th: "อัตราเติบโต %" },
	"row.deductible": { en: "Deductible", th: "ลดหย่อนภาษี" },
	"deductible.none": { en: "No", th: "ไม่" },
	"deductible.mortgageInterest": { en: "Mortgage", th: "ดอกเบี้ยบ้าน" },
	"row.add": { en: "Add row", th: "เพิ่มแถว" },
	"row.newIncome": { en: "New income", th: "รายได้ใหม่" },
	"row.newExpense": { en: "New expense", th: "ค่าใช้จ่ายใหม่" },
	"row.remove": { en: "Remove", th: "ลบ" },
	"row.addType": { en: "Add type", th: "เพิ่มประเภท" },
	"row.addItem": { en: "Add item", th: "เพิ่มรายการ" },
	"table.type": { en: "Type", th: "ประเภท" },
	"row.frequency": { en: "Per", th: "ต่อ" },
	"freq.monthly": { en: "Month", th: "เดือน" },
	"freq.yearly": { en: "Year", th: "ปี" },
	"freq.perMonth": { en: "/month", th: "/เดือน" },
	"freq.perYear": { en: "/year", th: "/ปี" },
	"table.total": { en: "Total", th: "รวม" },
	"table.rate": { en: "Amount", th: "จำนวนเงิน" },
	"table.lifetime": { en: "Lifetime", th: "รวมตลอดช่วง" },
	"table.month": { en: "Month", th: "เดือน" },
	"group.addItem": { en: "Add {label}", th: "เพิ่ม{label}" },
	"group.empty": { en: "No entries yet", th: "ยังไม่มีรายการ" },
	"dialog.addType.income": { en: "Add income type", th: "เพิ่มประเภทรายได้" },
	"dialog.addType.expense": { en: "Add expense type", th: "เพิ่มประเภทค่าใช้จ่าย" },
	"dialog.addType.asset": { en: "Add asset type", th: "เพิ่มประเภททรัพย์สิน" },
	"dialog.addType.liability": { en: "Add liability type", th: "เพิ่มประเภทหนี้สิน" },
	"dialog.allTypesAdded": { en: "All types added", th: "เพิ่มครบทุกประเภทแล้ว" },
	"dialog.addItem": { en: "Add {label}", th: "เพิ่ม{label}" },
	"dialog.editItem": { en: "Edit {label}", th: "แก้ไข{label}" },
	"dialog.save": { en: "Save", th: "บันทึก" },
	"dialog.cancel": { en: "Cancel", th: "ยกเลิก" },
	"milestone.add": { en: "Add milestone", th: "เพิ่มหมุดหมาย" },
	"milestone.edit": { en: "Edit milestone", th: "แก้ไขหมุดหมาย" },

	// Income types
	"type.salary": { en: "Salary", th: "เงินเดือน" },
	"type.hourlyWage": { en: "Hourly wage", th: "ค่าจ้างรายชั่วโมง" },
	"type.rsuGrant": { en: "RSU grant", th: "หุ้น RSU" },
	"type.inheritance": { en: "Inheritance", th: "มรดก" },
	"type.sideHustle": { en: "Side hustle", th: "งานเสริม" },
	"type.taxCredit": { en: "Tax credit", th: "เครดิตภาษี" },
	"type.taxDeduction": { en: "Tax deduction", th: "ลดหย่อนภาษี" },
	"type.pensionIncome": { en: "Pension income", th: "เงินบำนาญ" },
	"type.customIncome": { en: "Custom income", th: "รายได้อื่น ๆ" },

	// Expense types
	"type.livingExpenses": { en: "Living expenses", th: "ค่าใช้จ่ายในชีวิต" },
	"type.rent": { en: "Rent", th: "ค่าเช่า" },
	"type.debt": { en: "Debt", th: "หนี้" },
	"type.studentLoans": { en: "Student loans", th: "หนี้ กยศ." },
	"type.dependent": { en: "Dependent", th: "คนที่ดูแล" },
	"type.education": { en: "Education", th: "การศึกษา" },
	"type.healthCare": { en: "Health care", th: "สุขภาพ" },
	"type.vacation": { en: "Vacation", th: "วันหยุด" },
	"type.wedding": { en: "Wedding", th: "แต่งงาน" },
	"type.charity": { en: "Charity", th: "บริจาค" },
	"type.travel": { en: "Travel", th: "ท่องเที่ยว" },
	"type.medicalExpenses": { en: "Medical expenses", th: "ค่ารักษาพยาบาล" },
	"type.emergency": { en: "Emergency", th: "เงินฉุกเฉิน" },
	"type.customExpense": { en: "Custom expense", th: "ค่าใช้จ่ายอื่น ๆ" },

	// Asset types
	"type.stock": { en: "Stocks", th: "หุ้น" },
	"type.mutualFundNonDeductible": { en: "Mutual fund (non-deductible)", th: "กองทุนรวมทั่วไป" },
	"type.mutualFundDeductible": { en: "Mutual fund (deductible)", th: "กองทุนลดหย่อนภาษี" },
	"type.crypto": { en: "Crypto", th: "คริปโต" },
	"type.house": { en: "House", th: "บ้าน" },
	"type.car": { en: "Car", th: "รถยนต์" },
	"type.rentalProperty": { en: "Rental property", th: "บ้านให้เช่า" },
	"type.commercialProperty": { en: "Commercial property", th: "อาคารพาณิชย์" },
	"type.land": { en: "Land", th: "ที่ดิน" },
	"type.building": { en: "Building", th: "สิ่งปลูกสร้าง" },
	"type.motorcycle": { en: "Motorcycle", th: "มอเตอร์ไซค์" },
	"type.boat": { en: "Boat", th: "เรือ" },
	"type.jewelry": { en: "Jewelry", th: "เครื่องประดับ" },
	"type.preciousMetals": { en: "Precious metals", th: "โลหะมีค่า" },
	"type.furniture": { en: "Furniture", th: "เฟอร์นิเจอร์" },
	"type.instrument": { en: "Instrument", th: "เครื่องดนตรี" },
	"type.machinery": { en: "Machinery", th: "เครื่องจักร" },
	"type.customAsset": { en: "Custom asset", th: "ทรัพย์สินอื่น ๆ" },

	// Liability types (reuse "type.debt" and "type.studentLoans" from above)
	"type.medicalDebt": { en: "Medical debt", th: "หนี้ค่ารักษา" },
	"type.creditCardDebt": { en: "Credit card debt", th: "หนี้บัตรเครดิต" },

	// Wallets
	"wallets.split": { en: "Savings split", th: "สัดส่วนการออม" },
	"wallets.rates": { en: "Return rates", th: "อัตราผลตอบแทน" },
	"wallets.starting": { en: "Starting balances", th: "ยอดเริ่มต้น" },
	"wallet.emergency": { en: "Emergency fund", th: "เงินสำรองฉุกเฉิน" },
	"wallet.goal": { en: "Goal savings", th: "เงินออมเป้าหมาย" },
	"wallet.nontax": { en: "Investments", th: "การลงทุน" },
	"wallet.taxAdvantaged": { en: "ThaiESG / RMF", th: "ThaiESG / RMF" },

	// Summary — long term
	"summary.runsOut": { en: "Money runs out", th: "เงินหมดปี" },
	"summary.runsOut.never": { en: "Never — money lasts the whole plan", th: "ไม่หมด — เงินพอตลอดแผน" },
	"summary.retirement.funded": { en: "Retirement funded", th: "เกษียณได้" },
	"summary.retirement.short": { en: "Retirement short", th: "เกษียณไม่พอ" },
	"summary.retirement.left": { en: "left at {year}", th: "เหลือ {year}" },
	"summary.retirement.runsOutAt": { en: "runs out {year}", th: "เงินหมด {year}" },
	"summary.maxForever": { en: "Max forever spend", th: "ใช้ได้ตลอดไปสูงสุด" },
	"summary.goals": { en: "Goal checks", th: "ตรวจเป้าหมาย" },
	"summary.goals.none": { en: "No goals yet", th: "ยังไม่มีเป้าหมาย" },
	"summary.goal.onTrack": { en: "on track", th: "กำลังไปได้ดี" },
	"summary.goal.short": { en: "short {amount} in {year}", th: "ขาด {amount} ในปี {year}" },

	// Summary — this year
	"summary.optimizer.recommended": { en: "Recommended ThaiESG / RMF", th: "แนะนำลง ThaiESG / RMF" },
	"summary.optimizer.taxSaved": { en: "Tax saved this year", th: "ประหยัดภาษีปีนี้" },
	"summary.optimizer.cutoffNote": { en: "Stops when extra baht saves less than 15% in tax", th: "หยุดเมื่อบาทที่ลงเพิ่ม ประหยัดภาษีน้อยกว่า 15%" },
	"summary.paths.fund": { en: "in ThaiESG / RMF becomes", th: "ใน ThaiESG / RMF จะกลายเป็น" },
	"summary.paths.taxable": { en: "in taxable S&P 500 becomes", th: "ใน S&P 500 (เสียภาษี) จะกลายเป็น" },
	"summary.paths.gap": { en: "advantage", th: "ได้เปรียบ" },

	// Footer
	"footer.disclaimer": {
		en: "Assumptions: TH 2026 tax, nominal averages, ThaiESG/RMF redemption tax-free. Prove-of-concept demo.",
		th: "สมมติฐาน: ภาษีไทย 2569 ค่าเฉลี่ยระยะยาว ถอน ThaiESG/RMF ไม่เสียภาษี ตัวอย่างเพื่อทดลอง",
	},
	"a11y.locale": { en: "Language", th: "ภาษา" },
	"a11y.leftTabs": { en: "Panel view", th: "มุมมองแผง" },
	"tab.financials": { en: "By the numbers", th: "ตัวเลข" },
	"tab.milestone": { en: "Milestone", th: "หมุดหมาย" },
	"tab.income": { en: "Income", th: "รายได้" },
	"tab.expenses": { en: "Expenses", th: "ค่าใช้จ่าย" },
	"tab.assets": { en: "Assets", th: "ทรัพย์สิน" },
	"tab.liabilities": { en: "Liabilities", th: "หนี้สิน" },
	"tab.wallet": { en: "Wallet", th: "กระเป๋าเงิน" },
	"wallets.heading": { en: "Wallets", th: "กระเป๋าเงิน" },
	"row.until": { en: "Until", th: "ถึง" },
	"a11y.netWorthChart": { en: "Net worth projection chart", th: "แผนภูมิมูลค่าสุทธิ" },

	// Month / year picker
	"picker.now": { en: "Now", th: "ตอนนี้" },
	"picker.forever": { en: "Forever", th: "ตลอดไป" },
	"picker.month": { en: "Month", th: "เดือน" },
	"picker.year": { en: "Year", th: "ปี" },
	"picker.thisYear": { en: "This year", th: "ปีนี้" },

	// Settings page (mock)
	"settings.note": { en: "Mock — nothing is saved yet.", th: "ตัวอย่าง — ยังไม่บันทึกจริง" },
	"settings.name": { en: "Display name", th: "ชื่อที่แสดง" },
	"settings.birthday": { en: "Birthday", th: "วันเกิด" },
	"settings.gender": { en: "Gender", th: "เพศ" },
	"settings.gender.female": { en: "Female", th: "หญิง" },
	"settings.gender.male": { en: "Male", th: "ชาย" },
	"settings.gender.other": { en: "Other", th: "อื่น ๆ" },

	// Assistant rail (right column) — Astryx ai-chat style.
	"rail.title": { en: "Assistant", th: "ผู้ช่วย" },
	"rail.subtitle": { en: "Demo — canned replies", th: "ตัวอย่าง — ตอบล่วงหน้า" },
	"rail.today": { en: "Today", th: "วันนี้" },
	"rail.you": { en: "You", th: "คุณ" },
	"rail.ask": { en: "Ask", th: "ถาม" },
	"rail.planSummary": { en: "Plan snapshot", th: "ภาพรวมแผน" },

	// Chat panel (mock replies — real assistant lands later)
	"chat.title": { en: "Assistant", th: "ผู้ช่วย" },
	"chat.subtitle": { en: "Demo — canned replies", th: "ตัวอย่าง — ตอบล่วงหน้า" },
	"chat.placeholder": { en: "Ask about your plan…", th: "ถามเรื่องแผนของคุณ…" },
	"chat.send": { en: "Send", th: "ส่ง" },
	"chat.empty": {
		en: "Ask about your plan — try “Can I retire early?”",
		th: "ถามเรื่องแผนของคุณได้เลย ลองถาม “เกษียณเร็วได้ไหม”",
	},
	"chat.reply.summary": { en: "Here is where your plan stands right now:", th: "สถานะแผนของคุณตอนนี้:" },
	"chat.reply.retirement": {
		en: "Retirement looks {status}: {detail}",
		th: "เกษียณ{status}: {detail}",
	},
	"chat.reply.runway": {
		en: "On the current plan your money lasts until {year}.",
		th: "ด้วยแผนปัจจุบัน เงินของคุณพอถึงปี {year}",
	},
	"chat.reply.maxForever": {
		en: "You could spend about {amount} per month, forever, from today.",
		th: "คุณใช้ได้ราว {amount} ต่อเดือน ตลอดไป จากวันนี้",
	},
	"chat.reply.fallback": {
		en: "Got it — this demo replies with a few canned answers. The real assistant lands soon.",
		th: "รับทราบ — ตัวอย่างนี้ตอบด้วยคำตอบสำเร็จรูป ตัวจริงเร็ว ๆ นี้",
	},
	"chat.status.funded": { en: "on track", th: "กำลังไปได้ดี" },
	"chat.status.short": { en: "at risk", th: "มีความเสี่ยง" },
	"plan.keepCurrent": { en: "Every input is live", th: "ทุกตัวเลขแก้ได้สด ๆ" },
	"plan.summaryBody": {
		en: "Edit any input below — the chart, your numbers, and this plan update instantly.",
		th: "แก้ตัวเลขด้านล่างได้เลย กราฟ ตัวเลข และแผนจะอัปเดตทันที",
	},

	// Empty states and resilient error loading (Root & Component level)
	"empty.home.title": { en: "Unable to load plan", th: "ไม่สามารถโหลดข้อมูลแผนได้" },
	"empty.home.description": {
		en: "Something went wrong while fetching your plan. Click reload to try again.",
		th: "เกิดข้อผิดพลาดในการโหลดข้อมูลแผนของคุณ คลิกโหลดใหม่เพื่อลองอีกครั้ง",
	},
	"empty.settings.title": { en: "Unable to load settings", th: "ไม่สามารถโหลดข้อมูลการตั้งค่าได้" },
	"empty.settings.description": {
		en: "Something went wrong while fetching your settings. Click reload to try again.",
		th: "เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่าของคุณ คลิกโหลดใหม่เพื่อลองอีกครั้ง",
	},
	"action.reload": { en: "Reload", th: "โหลดใหม่" },
	"action.retry": { en: "Retry", th: "ลองใหม่" },
	"component.error.band": {
		en: "Market band simulation unavailable.",
		th: "ไม่สามารถโหลดแถบการจำลองตลาดได้",
	},
	"component.error.generic": {
		en: "Failed to load this section.",
		th: "ไม่สามารถโหลดข้อมูลส่วนนี้ได้",
	},
}

/** Optional per-locale overrides on top of `strings` (none needed yet). */
export const thOverrides: Dictionary = {}

/** Build a translator over the UI strings for a locale (usable outside React). */
export function getTranslator(locale: Locale) {
	return createTranslator({ en: strings, th: { ...strings, ...thOverrides } }, locale)
}
