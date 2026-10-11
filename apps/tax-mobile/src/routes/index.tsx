import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
	getTaxSystem,
	type TaxInput,
	type TaxResult,
	type BracketBreakdown,
} from '@excited-live/tax'
import { FeyMark, SettingsIcon } from '@excited-live/design-system'

export const Route = createFileRoute('/')({
	component: IndexComponent,
})

type SectionType = 'income' | 'allowances' | 'invest' | 'brackets'
type Locale = 'en' | 'th'

/* ------------------------------------------------------------------ */
/* Stroke Icons for World App / Revolut Mobile Aesthetic              */
/* ------------------------------------------------------------------ */

function ScanIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
			<rect x="7" y="7" width="10" height="10" rx="1.5" />
		</svg>
	)
}

function IncomeIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<rect x="2" y="6" width="20" height="12" rx="2" />
			<circle cx="12" cy="12" r="3" />
			<path d="M6 12h.01M18 12h.01" />
		</svg>
	)
}

function AllowancesIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
			<path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
		</svg>
	)
}

function InvestIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
			<polyline points="16 7 22 7 22 13" />
		</svg>
	)
}

function BracketsIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M4 19h16" />
			<path d="M4 15l4-4 4 2 6-6" />
			<path d="M14 7h4v4" />
		</svg>
	)
}

function HomeNavIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	)
}

function SheetNavIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
			<line x1="10" y1="9" x2="8" y2="9" />
		</svg>
	)
}

/* ------------------------------------------------------------------ */
/* MoneyInput — Live comma separators, caret preservation, mobile UX   */
/* ------------------------------------------------------------------ */

function groupDigitsDetailed(text: string): { grouped: string; map: number[] } {
	const [intPart = '', ...rest] = text.split('.')
	let grouped = ''
	const map: number[] = []
	for (let i = 0; i < intPart.length; i++) {
		const remaining = intPart.length - i
		if (remaining > 1 && remaining % 3 === 0 && i > 0) {
			grouped += ','
			map.push(i - 1)
		}
		grouped += intPart[i]
		map.push(i)
	}
	return {
		grouped: rest.length > 0 ? `${grouped}.${rest.join('.')}` : grouped,
		map,
	}
}

function groupDigits(text: string): string {
	return groupDigitsDetailed(text).grouped
}

function classifyMoneyText(text: string): { kind: 'empty' | 'partial' | 'ok'; value: number } {
	const compact = text.replace(/[,\s]/g, '')
	if (compact === '') return { kind: 'empty', value: 0 }
	if (!/^\d+(\.\d*)?$/.test(compact)) return { kind: 'partial', value: 0 }
	return { kind: 'ok', value: Number(compact) }
}

interface MoneyInputProps {
	id: string
	label: string
	value: number | null
	onChange: (value: number) => void
	currency?: string
	hint?: string
}

function MoneyInput({ id, label, value, onChange, currency = '฿', hint }: MoneyInputProps) {
	const [draft, setDraft] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const pendingCaret = useRef<number | null>(null)
	const lastDisplay = useRef('')

	const display =
		draft !== null
			? groupDigits(draft.replace(/[,\s]/g, ''))
			: value == null || value === 0
				? ''
				: groupDigits(String(value))

	useEffect(() => {
		const input = inputRef.current
		if (!input || pendingCaret.current === null || lastDisplay.current === display) {
			if (input && pendingCaret.current === null) lastDisplay.current = display
			return
		}

		const digitsBefore = lastDisplay.current.slice(0, pendingCaret.current).replace(/[,\s]/g, '').length
		let count = 0
		let next = display.length
		for (let i = 0; i < display.length; i++) {
			if (display[i] !== ',' && display[i] !== ' ') {
				count++
				if (count === digitsBefore) {
					next = i + 1
					break
				}
			}
		}
		if (digitsBefore === 0) next = 0
		pendingCaret.current = null
		lastDisplay.current = display
		requestAnimationFrame(() => input.setSelectionRange(next, next))
	}, [display])

	const handleChange = (next: string) => {
		const input = inputRef.current
		if (input) {
			pendingCaret.current = input.selectionStart ?? null
			lastDisplay.current = input.value
		}
		setDraft(next)
		const { kind, value: parsed } = classifyMoneyText(next)
		if (kind === 'empty') {
			onChange(0)
		} else if (kind === 'ok') {
			onChange(parsed)
		}
	}

	const handleBlur = () => {
		if (draft !== null) {
			const { kind } = classifyMoneyText(draft)
			if (kind === 'partial') {
				onChange(0)
			}
			setDraft(null)
		}
	}

	return (
		<div className="money-input-field">
			<div className="money-input-header">
				<label htmlFor={id} className="money-input-label">{label}</label>
				{hint && <span className="money-input-hint">{hint}</span>}
			</div>
			<div className="money-input-box">
				<span className="money-currency-symbol">{currency}</span>
				<input
					id={id}
					ref={inputRef}
					type="text"
					inputMode="decimal"
					className="money-input-elem"
					value={display}
					placeholder="0"
					onFocus={(event) => {
						requestAnimationFrame(() => event.target.select())
					}}
					onChange={(event) => handleChange(event.target.value)}
					onBlur={handleBlur}
				/>
			</div>
		</div>
	)
}

/* ------------------------------------------------------------------ */
/* Bilingual Copy                                                     */
/* ------------------------------------------------------------------ */

const I18N = {
	en: {
		appTitle: 'Tax',
		appBadge: '2026',
		heroRefund: 'Tax Refund',
		heroToPay: 'Tax to Pay',
		heroSettled: 'Tax Settled',
		effectiveRate: 'Effective Rate',
		marginalRate: 'Marginal Rate',
		auditMath: 'Audit Math',
		shortcutIncome: 'Income',
		shortcutAllowances: 'Allowances',
		shortcutInvest: 'Invest',
		shortcutBrackets: 'Brackets',
		grossIncome: 'Gross Income',
		salaryLabel: 'Salary & Employment',
		freelanceLabel: 'Freelance & Contracting',
		rentalLabel: 'Rental Property',
		expenseDeductionHint: 'Standard expense deductions are auto-applied (50% up to ฿100k for salary, 30% for freelance).',
		withholdingSection: 'Taxes Already Paid (50 Tawi)',
		withheldSource: 'Withheld at Source',
		advancePaid: 'Prepaid / Estimated Tax',
		familyAllowances: 'Family Allowances',
		selfAllowance: 'Taxpayer Allowance',
		spouseAllowance: 'Spouse (No Income)',
		childrenAllowance: 'Children',
		parentsAllowance: 'Parents (Age 60+)',
		itemizedTitle: 'Deductions & Investments',
		lifeHealthInsurance: 'Life & Health Insurance',
		mortgageInterest: 'Mortgage Interest',
		ssfSavings: 'Super Savings Fund (SSF)',
		rmfSavings: 'Retirement Mutual Fund (RMF)',
		providentFund: 'Provident Fund (PVD)',
		combinedRetirementCap: 'Retirement Pool: ฿500,000 cap',
		youSaveBanner: 'You save',
		withDeductionsPrefix: 'with current deductions',
		bracketTitle: '2026 Progressive Brackets',
		taxableIncome: 'Taxable Income',
		detailsBtn: 'Tax Math Breakdown',
		closeBtn: 'Close',
		cappedNotice: 'Capped at statutory limit',
		settingsTitle: 'Tax Settings',
		language: 'Language',
		taxYear: 'Tax Year',
		engineStatus: 'Pure On-Device Engine',
		zeroCloud: '100% private, zero financial data sent to cloud.',
		resetData: 'Reset to Sample Data',
	},
	th: {
		appTitle: 'ภาษี',
		appBadge: '2569',
		heroRefund: 'ภาษีที่จะได้รับคืน',
		heroToPay: 'ภาษีที่ต้องชำระเพิ่ม',
		heroSettled: 'ชำระภาษีครบถ้วน',
		effectiveRate: 'อัตราภาษีจริง',
		marginalRate: 'ฐานภาษีสูงสุด',
		auditMath: 'แจกแจงภาษี',
		shortcutIncome: 'รายได้',
		shortcutAllowances: 'ลดหย่อน',
		shortcutInvest: 'เงินออม',
		shortcutBrackets: 'ขั้นบันได',
		grossIncome: 'รายได้รวมทั้งปี',
		salaryLabel: 'เงินเดือนและค่าจ้างประจำ',
		freelanceLabel: 'ฟรีแลนซ์และรับจ้างอิสระ',
		rentalLabel: 'รายได้จากค่าเช่า',
		expenseDeductionHint: 'หักค่าใช้จ่ายตามกฎหมายให้อัตโนมัติ (เงินเดือน 50% สูงสุด 1 แสน, ฟรีแลนซ์ 30%)',
		withholdingSection: 'ภาษีที่จ่ายล่วงหน้าแล้ว (ใบ 50 ทวิ)',
		withheldSource: 'ภาษีหัก ณ ที่จ่าย',
		advancePaid: 'ภาษีชำระล่วงหน้า / ครึ่งปี',
		familyAllowances: 'ลดหย่อนครอบครัว',
		selfAllowance: 'ลดหย่อนส่วนตัว',
		spouseAllowance: 'คู่สมรส (ไม่มีเงินได้)',
		childrenAllowance: 'บุตร',
		parentsAllowance: 'บิดามารดา (อายุ 60 ปีขึ้นไป)',
		itemizedTitle: 'รายการลดหย่อนและการลงทุน',
		lifeHealthInsurance: 'เบี้ยประกันชีวิตและสุขภาพ',
		mortgageInterest: 'ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย',
		ssfSavings: 'กองทุนเพื่อการออม (SSF)',
		rmfSavings: 'กองทุนรวมเพื่อการเลี้ยงชีพ (RMF)',
		providentFund: 'กองทุนสำรองเลี้ยงชีพ (PVD)',
		combinedRetirementCap: 'เพดานกลุ่มเงินออมเกษียณ 500,000 บาท',
		youSaveBanner: 'คุณประหยัดภาษีได้',
		withDeductionsPrefix: 'จากรายการลดหย่อนที่คุณกรอก',
		bracketTitle: 'ขั้นบันไดภาษีปี 2569',
		taxableIncome: 'เงินได้สุทธิที่ต้องเสียภาษี',
		detailsBtn: 'ดูรายละเอียดการคำนวณ',
		closeBtn: 'ปิด',
		cappedNotice: 'จำกัดตามเพดานที่กฎหมายกำหนด',
		settingsTitle: 'การตั้งค่าภาษี',
		language: 'ภาษา',
		taxYear: 'ปีภาษี',
		engineStatus: 'ประมวลผลบนเครื่อง (Pure Engine)',
		zeroCloud: 'ปลอดภัย 100% ข้อมูลการเงินไม่ถูกส่งออกนอกเครื่อง',
		resetData: 'รีเซ็ตข้อมูลตัวอย่าง',
	},
}

function formatTHB(amount: number): string {
	return `฿${Math.round(amount).toLocaleString('en-US')}`
}

function IndexComponent() {
	const [locale, setLocale] = useState<Locale>('th')
	const [activeSection, setActiveSection] = useState<SectionType>('income')
	const [showWaterfall, setShowWaterfall] = useState<boolean>(false)
	const [showSettings, setShowSettings] = useState<boolean>(false)

	// Income state
	const [salary, setSalary] = useState<number>(720000)
	const [freelance, setFreelance] = useState<number>(120000)
	const [rental, setRental] = useState<number>(0)

	// Allowances state
	const [hasSpouse, setHasSpouse] = useState<boolean>(false)
	const [childrenCount, setChildrenCount] = useState<number>(1)
	const [parentsCount, setParentsCount] = useState<number>(2)

	// Deductions state
	const [insurance, setInsurance] = useState<number>(50000)
	const [mortgage, setMortgage] = useState<number>(30000)
	const [ssf, setSsf] = useState<number>(80000)
	const [rmf, setRmf] = useState<number>(60000)
	const [provident, setProvident] = useState<number>(36000)

	// Withheld state
	const [withheld, setWithheld] = useState<number>(45000)
	const [estimatedPaid, setEstimatedPaid] = useState<number>(0)

	const t = I18N[locale]
	const thaiSystem = useMemo(() => getTaxSystem('TH', 2026), [])

	// Build tax input
	const taxInput: TaxInput = useMemo(() => {
		const incomes = []
		if (salary > 0) incomes.push({ categoryCode: 'employment', amount: salary })
		if (freelance > 0) incomes.push({ categoryCode: 'freelance', amount: freelance })
		if (rental > 0) incomes.push({ categoryCode: 'rental', amount: rental })

		return {
			incomes: incomes.length > 0 ? incomes : [{ categoryCode: 'employment', amount: 0 }],
			allowances: {
				personal: 1,
				spouse: hasSpouse ? 1 : 0,
				children: childrenCount,
				parents: Math.min(parentsCount, 4),
				disabled: 0,
			},
			deductions: {
				insurance,
				mortgageInterest: mortgage,
				donations: 0,
				retirementSavings: {
					ssf,
					rmf,
					provident,
				},
			},
			withheld,
			estimatedPaid,
			filingStatus: 'single',
		}
	}, [salary, freelance, rental, hasSpouse, childrenCount, parentsCount, insurance, mortgage, ssf, rmf, provident, withheld, estimatedPaid])

	// Compute primary result
	const result: TaxResult = useMemo(() => {
		return thaiSystem.compute(taxInput)
	}, [thaiSystem, taxInput])

	// Compute baseline result without itemized deductions to show tax savings
	const taxWithoutDeductions = useMemo(() => {
		const baselineInput: TaxInput = {
			...taxInput,
			deductions: {
				insurance: 0,
				mortgageInterest: 0,
				donations: 0,
				retirementSavings: { ssf: 0, rmf: 0, provident: 0 },
			},
		}
		return thaiSystem.compute(baselineInput).netTax
	}, [thaiSystem, taxInput])

	const taxSaved = Math.max(0, taxWithoutDeductions - result.netTax)
	const retirementTotal = ssf + rmf + provident
	const retirementCap = 500000
	const isRetirementCapped = retirementTotal > retirementCap

	const isRefund = result.balance < 0
	const isToPay = result.balance > 0
	const balanceAbs = Math.abs(result.balance)

	const resetToDefault = () => {
		setSalary(720000)
		setFreelance(120000)
		setRental(0)
		setHasSpouse(false)
		setChildrenCount(1)
		setParentsCount(2)
		setInsurance(50000)
		setMortgage(30000)
		setSsf(80000)
		setRmf(60000)
		setProvident(36000)
		setWithheld(45000)
		setEstimatedPaid(0)
		setShowSettings(false)
	}

	return (
		<div className="tax-app-container">
			{/* Top Navigation Bar — World App / Revolut Style with Ambient Glow */}
			<div className="top-nav-bar">
				<button
					type="button"
					className="top-round-btn"
					aria-label="Scan tax certificate"
					onClick={() => alert('50 Tawi OCR Document Scanner ready for camera feed.')}
				>
					<ScanIcon />
				</button>

				<div className="top-title-group">
					<span className="top-brand-icon">
						<FeyMark size={18} />
					</span>
					<span className="top-title-text">{t.appTitle}</span>
				</div>

				<button
					type="button"
					className="top-round-btn"
					aria-label="Settings"
					onClick={() => setShowSettings(true)}
				>
					<SettingsIcon width={19} height={19} />
				</button>
			</div>

			{/* World App Inspired Hero Card — Dark Luxury Finish with Ambient Lighting */}
			<div className="luxury-hero-card">
				<div className="hero-card-header">
					<div className="hero-badge-wrap">
						<div className="hero-logo-mark">
							<FeyMark size={16} />
						</div>
						<span className="hero-brand-name">excited.live</span>
					</div>
					<div className="hero-year-chip">{t.appBadge}</div>
				</div>

				<div className="hero-center-balance">
					<div className="hero-balance-figure">
						{formatTHB(balanceAbs)}
					</div>
					<div className="hero-balance-label">
						{isRefund ? t.heroRefund : isToPay ? t.heroToPay : t.heroSettled}
					</div>
				</div>

				<div className="hero-card-footer">
					<div className="hero-footer-left">
						<span className="hero-rate-tag">{t.effectiveRate}</span>
						<span className="hero-rate-value">{(result.effectiveRate * 100).toFixed(1)}%</span>
					</div>

					<button
						type="button"
						className="hero-audit-btn"
						onClick={() => setShowWaterfall(true)}
					>
						{t.auditMath}
					</button>
				</div>
			</div>

			{/* Pagination Dots (World App indicator) */}
			<div className="pagination-dots">
				<span className="dot active" />
				<span className="dot" />
				<span className="dot" />
			</div>

			{/* Quick Category Shortcut Grid — 4 Squircle Icons */}
			<div className="shortcut-grid">
				<button
					type="button"
					className={`shortcut-item ${activeSection === 'income' ? 'active' : ''}`}
					onClick={() => setActiveSection('income')}
				>
					<div className="shortcut-icon-box">
						<IncomeIcon />
					</div>
					<span className="shortcut-label">{t.shortcutIncome}</span>
				</button>

				<button
					type="button"
					className={`shortcut-item ${activeSection === 'allowances' ? 'active' : ''}`}
					onClick={() => setActiveSection('allowances')}
				>
					<div className="shortcut-icon-box">
						<AllowancesIcon />
					</div>
					<span className="shortcut-label">{t.shortcutAllowances}</span>
				</button>

				<button
					type="button"
					className={`shortcut-item ${activeSection === 'invest' ? 'active' : ''}`}
					onClick={() => setActiveSection('invest')}
				>
					<div className="shortcut-icon-box">
						<InvestIcon />
					</div>
					<span className="shortcut-label">{t.shortcutInvest}</span>
				</button>

				<button
					type="button"
					className={`shortcut-item ${activeSection === 'brackets' ? 'active' : ''}`}
					onClick={() => setActiveSection('brackets')}
				>
					<div className="shortcut-icon-box">
						<BracketsIcon />
					</div>
					<span className="shortcut-label">{t.shortcutBrackets}</span>
				</button>
			</div>

			{/* Tax Savings Callout Banner */}
			{taxSaved > 0 && (
				<div className="tax-savings-banner">
					<div className="banner-glow-dot" />
					<div className="banner-text">
						<span className="banner-headline">{t.youSaveBanner} {formatTHB(taxSaved)}</span>
						<span className="banner-sub">{t.withDeductionsPrefix}</span>
					</div>
				</div>
			)}

			{/* Section 1: Income */}
			{activeSection === 'income' && (
				<div className="content-space">
					<div className="luxury-section-card">
						<h3 className="card-section-title">{t.grossIncome}</h3>
						<p className="card-section-hint">{t.expenseDeductionHint}</p>

						<MoneyInput
							id="salary-in"
							label={t.salaryLabel}
							value={salary}
							onChange={setSalary}
							hint="50% auto capped ฿100k"
						/>

						<MoneyInput
							id="freelance-in"
							label={t.freelanceLabel}
							value={freelance}
							onChange={setFreelance}
							hint="30% auto expense"
						/>

						<MoneyInput
							id="rental-in"
							label={t.rentalLabel}
							value={rental}
							onChange={setRental}
							hint="30% auto expense"
						/>
					</div>

					<div className="luxury-section-card">
						<h3 className="card-section-title">{t.withholdingSection}</h3>
						<MoneyInput
							id="withheld-in"
							label={t.withheldSource}
							value={withheld}
							onChange={setWithheld}
						/>
						<MoneyInput
							id="adv-in"
							label={t.advancePaid}
							value={estimatedPaid}
							onChange={setEstimatedPaid}
						/>
					</div>
				</div>
			)}

			{/* Section 2: Family Allowances */}
			{activeSection === 'allowances' && (
				<div className="content-space">
					<div className="luxury-section-card">
						<h3 className="card-section-title">{t.familyAllowances}</h3>

						{/* Self (Always included) */}
						<div className="stepper-row">
							<div>
								<div className="stepper-label">{t.selfAllowance}</div>
								<div className="stepper-sub">฿60,000</div>
							</div>
							<span className="included-chip">Included</span>
						</div>

						{/* Spouse */}
						<div className="stepper-row">
							<div>
								<div className="stepper-label">{t.spouseAllowance}</div>
								<div className="stepper-sub">+฿60,000</div>
							</div>
							<button
								type="button"
								className={`pill-toggle-btn ${hasSpouse ? 'active' : ''}`}
								onClick={() => setHasSpouse(!hasSpouse)}
							>
								{hasSpouse ? 'Yes' : 'No'}
							</button>
						</div>

						{/* Children */}
						<div className="stepper-row">
							<div>
								<div className="stepper-label">{t.childrenAllowance}</div>
								<div className="stepper-sub">+฿30,000 / child</div>
							</div>
							<div className="stepper-pill-controls">
								<button
									type="button"
									className="stepper-btn"
									onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
								>
									−
								</button>
								<span className="stepper-value">{childrenCount}</span>
								<button
									type="button"
									className="stepper-btn"
									onClick={() => setChildrenCount(childrenCount + 1)}
								>
									+
								</button>
							</div>
						</div>

						{/* Parents (Max 4) */}
						<div className="stepper-row">
							<div>
								<div className="stepper-label">{t.parentsAllowance}</div>
								<div className="stepper-sub">+฿30,000 / parent (max 4)</div>
							</div>
							<div className="stepper-pill-controls">
								<button
									type="button"
									className="stepper-btn"
									onClick={() => setParentsCount(Math.max(0, parentsCount - 1))}
								>
									−
								</button>
								<span className="stepper-value">{parentsCount}</span>
								<button
									type="button"
									className="stepper-btn"
									onClick={() => setParentsCount(Math.min(4, parentsCount + 1))}
								>
									+
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Section 3: Invest & Deductions */}
			{activeSection === 'invest' && (
				<div className="content-space">
					<div className="luxury-section-card">
						<h3 className="card-section-title">{t.itemizedTitle}</h3>

						<MoneyInput
							id="ins-in"
							label={t.lifeHealthInsurance}
							value={insurance}
							onChange={setInsurance}
							hint="Max ฿100,000"
						/>

						<MoneyInput
							id="mort-in"
							label={t.mortgageInterest}
							value={mortgage}
							onChange={setMortgage}
							hint="Max ฿100,000"
						/>

						{/* Combined Retirement Cap Meter */}
						<div className="retirement-pool-meter">
							<div className="meter-label-row">
								<span>{t.combinedRetirementCap}</span>
								<span className={isRetirementCapped ? 'meter-alert' : ''}>
									{formatTHB(retirementTotal)} / ฿500,000
								</span>
							</div>
							<div className="meter-track">
								<div
									className={`meter-bar ${isRetirementCapped ? 'capped' : ''}`}
									style={{ width: `${Math.min(100, (retirementTotal / retirementCap) * 100)}%` }}
								/>
							</div>
							{isRetirementCapped && (
								<span className="meter-warning">⚠️ {t.cappedNotice} (฿500,000)</span>
							)}
						</div>

						<MoneyInput
							id="ssf-in"
							label={t.ssfSavings}
							value={ssf}
							onChange={setSsf}
							hint="Max 30% / ฿200k"
						/>

						<MoneyInput
							id="rmf-in"
							label={t.rmfSavings}
							value={rmf}
							onChange={setRmf}
							hint="Max 30%"
						/>

						<MoneyInput
							id="pvd-in"
							label={t.providentFund}
							value={provident}
							onChange={setProvident}
							hint="Max 15%"
						/>
					</div>
				</div>
			)}

			{/* Section 4: Progressive Brackets */}
			{activeSection === 'brackets' && (
				<div className="content-space">
					<div className="luxury-section-card">
						<h3 className="card-section-title">{t.bracketTitle}</h3>
						<div className="bracket-list">
							{result.brackets?.map((b: BracketBreakdown, idx: number) => {
								const isUserBracket = b.taxableInBracket > 0
								const isTopActive = result.marginalRate === b.rate && isUserBracket
								return (
									<div
										key={idx}
										className={`bracket-card ${isUserBracket ? 'bracket-active' : ''} ${isTopActive ? 'bracket-top' : ''}`}
									>
										<div className="bracket-card-top">
											<div className="rate-badge">
												{(b.rate * 100).toFixed(0)}%
											</div>
											<span className="range-text">
												{formatTHB(b.from)} – {b.to === Infinity ? 'Above ฿5M' : formatTHB(b.to)}
											</span>
										</div>
										<div className="bracket-card-bottom">
											<div className="bracket-col">
												<span className="sub-tag">{t.taxableIncome}</span>
												<span className="val-text">{formatTHB(b.taxableInBracket)}</span>
											</div>
											<div className="bracket-col right">
												<span className="sub-tag">Tax</span>
												<span className="val-text highlight">{formatTHB(b.tax)}</span>
											</div>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			)}

			{/* Floating Minimalist Bottom Navigation Bar — World App Style */}
			<div className="floating-bottom-dock">
				<button
					type="button"
					className={`dock-nav-btn ${activeSection === 'income' ? 'active' : ''}`}
					onClick={() => setActiveSection('income')}
					aria-label="Home / Income"
				>
					<HomeNavIcon />
				</button>

				<button
					type="button"
					className={`dock-nav-btn ${activeSection === 'brackets' ? 'active' : ''}`}
					onClick={() => setActiveSection('brackets')}
					aria-label="Brackets"
				>
					<BracketsIcon />
				</button>

				<button
					type="button"
					className="dock-nav-btn"
					onClick={() => setShowWaterfall(true)}
					aria-label="Audit Math Waterfall"
				>
					<SheetNavIcon />
				</button>

				<button
					type="button"
					className="dock-nav-btn"
					onClick={() => setShowSettings(true)}
					aria-label="Settings"
				>
					<SettingsIcon width={20} height={20} />
				</button>
			</div>

			{/* Slide-Up Math Waterfall Sheet */}
			{showWaterfall && (
				<div className="modal-overlay" onClick={() => setShowWaterfall(false)}>
					<div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
						<div className="sheet-pill-handle" />
						<div className="sheet-title-row">
							<h3 className="sheet-heading">{t.detailsBtn}</h3>
							<button
								type="button"
								className="sheet-dismiss-btn"
								onClick={() => setShowWaterfall(false)}
							>
								{t.closeBtn}
							</button>
						</div>

						<div className="sheet-waterfall-rows">
							<div className="audit-row">
								<span>Gross Income</span>
								<span className="audit-val">{formatTHB(result.grossIncome)}</span>
							</div>
							<div className="audit-row deduct">
								<span>− Expense Deductions</span>
								<span className="audit-val">−{formatTHB(result.expenseDeductions)}</span>
							</div>
							<div className="audit-row deduct">
								<span>− Family Allowances</span>
								<span className="audit-val">−{formatTHB(result.allowancesTotal)}</span>
							</div>
							<div className="audit-row deduct">
								<span>− Itemized Deductions</span>
								<span className="audit-val">−{formatTHB(result.itemizedDeductions)}</span>
							</div>
							<div className="audit-divider" />
							<div className="audit-row strong">
								<span>= Taxable Income</span>
								<span className="audit-val">{formatTHB(result.taxableIncome)}</span>
							</div>
							<div className="audit-row">
								<span>Tax Liability</span>
								<span className="audit-val">{formatTHB(result.taxLiability)}</span>
							</div>
							{result.credits > 0 && (
								<div className="audit-row deduct">
									<span>− Working Tax Credit</span>
									<span className="audit-val">−{formatTHB(result.credits)}</span>
								</div>
							)}
							<div className="audit-row strong">
								<span>= Net Tax</span>
								<span className="audit-val">{formatTHB(result.netTax)}</span>
							</div>
							<div className="audit-row deduct">
								<span>− Withheld & Prepaid</span>
								<span className="audit-val">−{formatTHB(withheld + estimatedPaid)}</span>
							</div>
							<div className="audit-divider" />
							<div className="audit-row final">
								<span>{isRefund ? t.heroRefund : t.heroToPay}</span>
								<span className="audit-val-final">{formatTHB(balanceAbs)}</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Slide-Up Settings Sheet */}
			{showSettings && (
				<div className="modal-overlay" onClick={() => setShowSettings(false)}>
					<div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
						<div className="sheet-pill-handle" />
						<div className="sheet-title-row">
							<h3 className="sheet-heading">{t.settingsTitle}</h3>
							<button
								type="button"
								className="sheet-dismiss-btn"
								onClick={() => setShowSettings(false)}
							>
								{t.closeBtn}
							</button>
						</div>

						<div className="settings-content">
							<div className="setting-item">
								<span className="setting-label">{t.language}</span>
								<div className="setting-pill-group">
									<button
										type="button"
										className={`setting-pill ${locale === 'th' ? 'active' : ''}`}
										onClick={() => setLocale('th')}
									>
										ภาษาไทย (TH)
									</button>
									<button
										type="button"
										className={`setting-pill ${locale === 'en' ? 'active' : ''}`}
										onClick={() => setLocale('en')}
									>
										English (EN)
									</button>
								</div>
							</div>

							<div className="setting-item">
								<span className="setting-label">{t.taxYear}</span>
								<span className="setting-val-chip">2026 (TH Revenue Dept)</span>
							</div>

							<div className="setting-card">
								<div className="setting-engine-title">
									<span className="engine-status-dot" />
									<span>{t.engineStatus}</span>
								</div>
								<p className="setting-engine-desc">{t.zeroCloud}</p>
							</div>

							<button
								type="button"
								className="setting-reset-btn"
								onClick={resetToDefault}
							>
								{t.resetData}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
