/**
 * The one expense vocabulary (#173).
 *
 * The keys are what the app already stores in `expenses.category`
 * (`apps/biz-mobile/.../AddExpenseDrawer` offers the personal and business
 * subsets of this list, and the stored value is the key verbatim). Do not
 * rename them: existing rows carry them.
 *
 * The Thai label is a write alias too: an agent in Thai sends "อาหาร", and a
 * strict slug-only enum would 400 the exact scenario this vocabulary exists
 * for. Writes accept a slug or a label and store the slug; reads normalize
 * legacy free text the same way, unknown values to `other`.
 */
export const EXPENSE_CATEGORIES = [
	{ slug: "ai", en: "AI Subscriptions", th: "ค่าสมาชิก AI" },
	{ slug: "capital_deploy", en: "Deploy Capital to Business", th: "ลงทุนในธุรกิจ" },
	{ slug: "connectivity", en: "Internet & Mobile", th: "อินเทอร์เน็ตและมือถือ" },
	{ slug: "dev_tool", en: "Developer Tools & APIs", th: "เครื่องมือนักพัฒนาและ API" },
	{ slug: "entertainment", en: "Subscriptions & Living", th: "ค่าสมาชิกและค่าใช้จ่ายในชีวิต" },
	{ slug: "family", en: "Family & Personal", th: "ครอบครัวและค่าใช้จ่ายส่วนตัว" },
	{ slug: "food", en: "Food & Dining", th: "อาหาร" },
	{ slug: "groceries", en: "Groceries & Household", th: "ของชำและของใช้ในบ้าน" },
	{ slug: "healthcare", en: "Healthcare & Wellness", th: "สุขภาพ" },
	{ slug: "housing", en: "Housing & Rent", th: "ที่อยู่อาศัยและค่าเช่า" },
	{ slug: "infrastructure", en: "Hosting & Infrastructure", th: "โฮสติ้งและโครงสร้างพื้นฐาน" },
	{ slug: "marketing", en: "Marketing & Sales", th: "การตลาดและการขาย" },
	{ slug: "office", en: "Office & Workspace", th: "ออฟฟิศและพื้นที่ทำงาน" },
	{ slug: "other", en: "Other", th: "อื่น ๆ" },
	{ slug: "saas", en: "SaaS & Productivity", th: "SaaS และเครื่องมือทำงาน" },
	{ slug: "transit", en: "Transit & Transport", th: "เดินทาง" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["slug"];

/** The slugs, in vocabulary order, for `z.enum`. */
export const EXPENSE_CATEGORY_SLUGS = EXPENSE_CATEGORIES.map((entry) => entry.slug) as [
	ExpenseCategory,
	...ExpenseCategory[],
];

/** Anything that is not a key or a known label: the legacy fallback bucket. */
export const UNCATEGORISED = "uncategorised" as const;

const BY_KEY = new Map<string, ExpenseCategory>(EXPENSE_CATEGORIES.map((entry) => [entry.slug, entry.slug]));

/**
 * Legacy / human spellings mapped onto a key. Built from the labels themselves
 * (plus the app's two longer variants) so "อาหาร", "Food & Dining" and "food"
 * all land in the same bucket instead of splitting a total.
 */
export const EXPENSE_CATEGORY_ALIASES: ReadonlyMap<string, ExpenseCategory> = new Map([
	...EXPENSE_CATEGORIES.flatMap((entry) => [
		[entry.slug.toLowerCase(), entry.slug] as const,
		[entry.en.toLowerCase(), entry.slug] as const,
		[entry.th.toLowerCase(), entry.slug] as const,
	]),
	["subscriptions", "entertainment"],
	["subscription", "entertainment"],
	// The `entertainment` Thai label before the #173 ratification fix (it had
	// no leading ค่า). The map is built from the current labels, so without
	// this entry a legacy PATCH still carrying the old string would miss the
	// map and fall through to `other`.
	["สมาชิกและค่าใช้จ่ายในชีวิต", "entertainment"],
	["utilities", "connectivity"],
	["utility", "connectivity"],
	["internet & mobile", "connectivity"],
	["developer tools & ai", "dev_tool"],
	["other personal outflow", "other"],
	["other business outflow", "other"],
	["อื่น ๆ", "other"],
	// The app's own catalog presets (packages/accounting/src/catalog.ts) and
	// its autofill fallback store these slugs verbatim. A bare enum 400s them,
	// so canonicalise at the write edge instead.
	["infra", "infrastructure"],
	["automation", "saas"],
	["general", "other"],
	// Common Thai ค่า- forms. The bare label is already in the vocabulary.
	["ค่าอาหาร", "food"],
	["ค่าเดินทาง", "transit"],
	["ค่าเช่า", "housing"],
	["ค่าที่พัก", "housing"],
	["ค่าไฟ", "connectivity"],
	["ค่าน้ำ", "connectivity"],
	["ค่าอินเทอร์เน็ต", "connectivity"],
	["ค่ามือถือ", "connectivity"],
	["ค่าสุขภาพ", "healthcare"],
	["ค่าของชำ", "groceries"],
	["ค่าโฆษณา", "marketing"],
	["ค่าการตลาด", "marketing"],
	["ค่าออฟฟิศ", "office"],
	["ค่าสมาชิก", "entertainment"],
	["ค่าซอฟต์แวร์", "saas"],
	["ค่าเครื่องมือ", "dev_tool"],
	["ค่าลงทุน", "capital_deploy"],
]);

/** True for a stored slug (case-sensitive; the wire value). */
export function isExpenseCategory(value: string): value is ExpenseCategory {
	return BY_KEY.has(value);
}

/**
 * The key for a supplied value when it is a slug or a known label, otherwise
 * the value unchanged, so a strict enum downstream can reject it with the
 * allowed-values message instead of silently becoming `other`.
 */
export function canonicalCategory(value: string): string {
	const key = value.trim().toLowerCase();
	return BY_KEY.get(key) ?? EXPENSE_CATEGORY_ALIASES.get(key) ?? value;
}

/**
 * Canonical key for a stored or supplied category: a slug or a Thai/English
 * label, case-insensitive. Anything unknown becomes `other`, never an error —
 * a legacy row must still read and still be editable.
 */
export function normalizeCategory(value: string | null | undefined): ExpenseCategory {
	if (!value) return "other";
	const key = value.trim().toLowerCase();
	return BY_KEY.get(key) ?? EXPENSE_CATEGORY_ALIASES.get(key) ?? "other";
}
