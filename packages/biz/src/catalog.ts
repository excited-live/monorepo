export interface CatalogItem {
	id: string;
	name: string;
	aliases: string[];
	type: "subscription" | "hardware" | "career" | "revenue";
	category: string;
	defaultAmounts: {
		THB?: number;
		USD?: number;
		[currency: string]: number | undefined;
	};
	cycle?: "monthly" | "yearly";
	domain?: string;
	imageUrl: string;
	coverImageUrl?: string;
	notes?: string;
}

export interface CuratedCoverWallpaper {
	id: string;
	title: string;
	imageUrl: string;
}

/**
 * Curated high-resolution wallpapers tailored for career and company
 * management hero backgrounds (1200px+ landscape with dark scrim compatibility).
 */
export const CURATED_COVER_WALLPAPERS: CuratedCoverWallpaper[] = [
	{
		id: "wall_modern_studio",
		title: "Minimal Studio",
		imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
	},
	{
		id: "wall_tech_desk",
		title: "Engineering Desk",
		imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
	},
	{
		id: "wall_bkk_skyscraper",
		title: "Bangkok Highrise",
		imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
	},
	{
		id: "wall_collab_space",
		title: "Open Collaboration",
		imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
	},
	{
		id: "wall_dark_terminal",
		title: "Code Lab",
		imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
	},
	{
		id: "wall_creative_atelier",
		title: "Creative Atelier",
		imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
	},
];

export function resolveFaviconUrl(domain: string, size = 128): string {
	const clean = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=${size}`;
}

export const CATALOG_PRESETS: CatalogItem[] = [
	// ==========================================
	// AI TOOLS & DEVELOPER SUBSCRIPTIONS
	// ==========================================
	{
		id: "tool_opencode",
		name: "Opencode Go",
		aliases: ["opencode", "opencode go", "open code", "opencode.ai"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 360, USD: 10 },
		cycle: "monthly",
		domain: "opencode.ai",
		imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=80",
		notes: "AI Dev tool & autonomous coding environment",
	},
	{
		id: "tool_chatgpt",
		name: "ChatGPT Plus",
		aliases: ["chatgpt", "chatgpt plus", "openai", "chat gpt", "gpt-4", "gpt"],
		type: "subscription",
		category: "ai",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "openai.com",
		imageUrl: resolveFaviconUrl("openai.com"),
		notes: "OpenAI ChatGPT Plus subscription",
	},
	{
		id: "tool_claude",
		name: "Claude Pro",
		aliases: ["claude", "claude pro", "anthropic", "claude 3", "claude sonnet"],
		type: "subscription",
		category: "ai",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "anthropic.com",
		imageUrl: resolveFaviconUrl("anthropic.com"),
		notes: "Anthropic Claude Pro subscription",
	},
	{
		id: "tool_cursor",
		name: "Cursor Pro",
		aliases: ["cursor", "cursor pro", "cursor ai", "cursor.com"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "cursor.com",
		imageUrl: resolveFaviconUrl("cursor.com"),
		notes: "AI-first code editor",
	},
	{
		id: "tool_copilot",
		name: "GitHub Copilot",
		aliases: ["github copilot", "copilot", "gh copilot"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 360, USD: 10 },
		cycle: "monthly",
		domain: "github.com",
		imageUrl: resolveFaviconUrl("github.com"),
		notes: "AI pair programmer",
	},
	{
		id: "tool_midjourney",
		name: "Midjourney Standard",
		aliases: ["midjourney", "midjourney standard", "midjourney pro"],
		type: "subscription",
		category: "ai",
		defaultAmounts: { THB: 1050, USD: 30 },
		cycle: "monthly",
		domain: "midjourney.com",
		imageUrl: resolveFaviconUrl("midjourney.com"),
		notes: "AI generative image platform",
	},
	{
		id: "tool_perplexity",
		name: "Perplexity Pro",
		aliases: ["perplexity", "perplexity pro", "perplexity ai"],
		type: "subscription",
		category: "ai",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "perplexity.ai",
		imageUrl: resolveFaviconUrl("perplexity.ai"),
		notes: "AI search and research engine",
	},
	{
		id: "tool_v0",
		name: "v0 Premium",
		aliases: ["v0", "v0 dev", "v0 by vercel"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "v0.dev",
		imageUrl: resolveFaviconUrl("v0.dev"),
		notes: "Generative UI tool by Vercel",
	},
	{
		id: "tool_elevenlabs",
		name: "ElevenLabs Starter",
		aliases: ["elevenlabs", "eleven labs", "11labs"],
		type: "subscription",
		category: "ai",
		defaultAmounts: { THB: 175, USD: 5 },
		cycle: "monthly",
		domain: "elevenlabs.io",
		imageUrl: resolveFaviconUrl("elevenlabs.io"),
		notes: "Voice AI & text to speech",
	},

	// ==========================================
	// GLOBAL DEV TOOLS, INFRA & PRODUCTIVITY
	// ==========================================
	{
		id: "tool_figma",
		name: "Figma Professional",
		aliases: ["figma", "figma pro", "figma professional"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 450, USD: 12 },
		cycle: "monthly",
		domain: "figma.com",
		imageUrl: resolveFaviconUrl("figma.com"),
		notes: "Collaborative interface design tool",
	},
	{
		id: "tool_notion",
		name: "Notion Plus",
		aliases: ["notion", "notion plus", "notion pro"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 350, USD: 10 },
		cycle: "monthly",
		domain: "notion.so",
		imageUrl: resolveFaviconUrl("notion.so"),
		notes: "Connected workspace for docs and wikis",
	},
	{
		id: "tool_linear",
		name: "Linear Standard",
		aliases: ["linear", "linear app", "linear standard"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 280, USD: 8 },
		cycle: "monthly",
		domain: "linear.app",
		imageUrl: resolveFaviconUrl("linear.app"),
		notes: "Issue tracking and project management",
	},
	{
		id: "tool_slack",
		name: "Slack Pro",
		aliases: ["slack", "slack pro"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 300, USD: 8.75 },
		cycle: "monthly",
		domain: "slack.com",
		imageUrl: resolveFaviconUrl("slack.com"),
		notes: "Team messaging and communication",
	},
	{
		id: "tool_github",
		name: "GitHub Team",
		aliases: ["github", "github team"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 140, USD: 4 },
		cycle: "monthly",
		domain: "github.com",
		imageUrl: resolveFaviconUrl("github.com"),
		notes: "Code repository & CI/CD",
	},
	{
		id: "tool_vercel",
		name: "Vercel Pro",
		aliases: ["vercel", "vercel pro"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "vercel.com",
		imageUrl: resolveFaviconUrl("vercel.com"),
		notes: "Frontend cloud deployment platform",
	},
	{
		id: "tool_aws",
		name: "AWS Cloud",
		aliases: ["aws", "amazon web services"],
		type: "subscription",
		category: "infra",
		defaultAmounts: { THB: 1000, USD: 30 },
		cycle: "monthly",
		domain: "aws.amazon.com",
		imageUrl: resolveFaviconUrl("aws.amazon.com"),
		notes: "Cloud infrastructure services",
	},
	{
		id: "tool_cloudflare",
		name: "Cloudflare Pro",
		aliases: ["cloudflare", "cloudflare pro", "cloudflare workers"],
		type: "subscription",
		category: "infra",
		defaultAmounts: { THB: 700, USD: 20 },
		cycle: "monthly",
		domain: "cloudflare.com",
		imageUrl: resolveFaviconUrl("cloudflare.com"),
		notes: "DNS, CDN & Edge compute",
	},
	{
		id: "tool_google_workspace",
		name: "Google Workspace",
		aliases: ["google workspace", "gsuite", "google suite", "gmail business"],
		type: "subscription",
		category: "dev_tool",
		defaultAmounts: { THB: 210, USD: 6 },
		cycle: "monthly",
		domain: "workspace.google.com",
		imageUrl: resolveFaviconUrl("google.com"),
		notes: "Business email and productivity apps",
	},
	{
		id: "tool_make",
		name: "Make (Integromat)",
		aliases: ["make", "integromat", "make.com"],
		type: "subscription",
		category: "automation",
		defaultAmounts: { THB: 57.5, USD: 9 },
		cycle: "monthly",
		domain: "make.com",
		imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80",
		notes: "Workflow automation",
	},

	// ==========================================
	// THAI DAILY SUBSCRIPTIONS & CONNECTIVITY
	// ==========================================
	{
		id: "sub_bts",
		name: "BTS SkyTrain",
		aliases: ["bts", "bts skytrain", "skytrain", "รถไฟฟ้าบีทีเอส", "บีทีเอส"],
		type: "subscription",
		category: "transit",
		defaultAmounts: { THB: 1400, USD: 40 },
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=200&q=80",
		notes: "Monthly transit pass in Bangkok",
	},
	{
		id: "sub_mrt",
		name: "MRT Subway",
		aliases: ["mrt", "mrt subway", "รถไฟฟ้าใต้ดิน", "เอ็มอาร์ที"],
		type: "subscription",
		category: "transit",
		defaultAmounts: { THB: 1200, USD: 35 },
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=200&q=80",
		notes: "Bangkok MRT Monthly Pass",
	},
	{
		id: "sub_ais",
		name: "AIS Fibre",
		aliases: ["ais", "ais fibre", "เอไอเอส", "ais fiber"],
		type: "subscription",
		category: "connectivity",
		defaultAmounts: { THB: 540, USD: 16 },
		cycle: "monthly",
		domain: "ais.th",
		imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=200&q=80",
		notes: "Home fiber optic internet",
	},
	{
		id: "sub_true",
		name: "True Online",
		aliases: ["true", "true online", "ทรู", "true internet", "true 5g"],
		type: "subscription",
		category: "connectivity",
		defaultAmounts: { THB: 599, USD: 17 },
		cycle: "monthly",
		domain: "true.th",
		imageUrl: resolveFaviconUrl("true.th"),
		notes: "Broadband internet & mobile plan",
	},

	// ==========================================
	// FAMOUS TECH COMPANIES IN THAILAND (CAREER & HERO BG)
	// ==========================================
	{
		id: "company_agoda",
		name: "Agoda",
		aliases: ["agoda", "agoda bangkok", "อโกด้า"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 120000, USD: 3500 },
		cycle: "monthly",
		domain: "agoda.com",
		imageUrl: resolveFaviconUrl("agoda.com"),
		coverImageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
		notes: "Bangkok CentralWorld tech HQ",
	},
	{
		id: "company_lineman",
		name: "LINE MAN Wongnai",
		aliases: ["line man", "lineman", "wongnai", "line man wongnai", "ไลน์แมน"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 95000, USD: 2800 },
		cycle: "monthly",
		domain: "lineman.line.me",
		imageUrl: resolveFaviconUrl("lineman.line.me"),
		coverImageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
		notes: "Bangkok T-One Building tech headquarters",
	},
	{
		id: "company_bitkub",
		name: "Bitkub Online",
		aliases: ["bitkub", "bitkub online", "บิทคับ"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 100000, USD: 3000 },
		cycle: "monthly",
		domain: "bitkub.com",
		imageUrl: resolveFaviconUrl("bitkub.com"),
		coverImageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
		notes: "Thailand digital asset exchange HQ",
	},
	{
		id: "company_ascend",
		name: "Ascend Money (TrueMoney)",
		aliases: ["ascend", "ascend money", "truemoney", "true money", "แอสเซนด์"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 90000, USD: 2600 },
		cycle: "monthly",
		domain: "ascendmoneygroup.com",
		imageUrl: resolveFaviconUrl("truemoney.com"),
		coverImageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
		notes: "Southeast Asia fintech powerhouse",
	},
	{
		id: "company_kbtg",
		name: "KBTG",
		aliases: ["kbtg", "kasikorn business-technology group", "กสิกร บิซิเนส", "kasikorn tech"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 95000, USD: 2800 },
		cycle: "monthly",
		domain: "kbtg.tech",
		imageUrl: resolveFaviconUrl("kbtg.tech"),
		coverImageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
		notes: "Kasikornbank technology innovation campus",
	},
	{
		id: "company_scb_techx",
		name: "SCB TechX",
		aliases: ["scb techx", "scb 10x", "scbtechx", "ไทยพาณิชย์ เทคเอ็กซ์"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 95000, USD: 2800 },
		cycle: "monthly",
		domain: "scbtechx.io",
		imageUrl: resolveFaviconUrl("scbtechx.io"),
		coverImageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
		notes: "Fintech engineering & cloud platform hub",
	},
	{
		id: "company_shopee",
		name: "Shopee Thailand",
		aliases: ["shopee", "shopee th", "sea group", "ช้อปปี้"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 90000, USD: 2600 },
		cycle: "monthly",
		domain: "shopee.co.th",
		imageUrl: resolveFaviconUrl("shopee.co.th"),
		coverImageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80",
		notes: "E-commerce & digital tech giant",
	},
	{
		id: "company_grab",
		name: "Grab Thailand",
		aliases: ["grab", "grab th", "grab taxi", "แกร็บ"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 90000, USD: 2600 },
		cycle: "monthly",
		domain: "grab.com",
		imageUrl: resolveFaviconUrl("grab.com"),
		coverImageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
		notes: "Southeast Asia superapp engineering center",
	},
	{
		id: "company_studio_excited",
		name: "Studio Excited",
		aliases: ["studio excited", "excited live", "excited.live", "fromsukong", "fromsukong studio"],
		type: "career",
		category: "career",
		defaultAmounts: { THB: 75000, USD: 2200 },
		cycle: "monthly",
		domain: "excited.live",
		imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
		coverImageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
		notes: "Design engineering practice & software studio",
	},
];

/**
 * Resolve the amount in the requested currency.
 * If currency is not found in defaultAmounts, defaults to THB (or USD) or dynamic fallback.
 */
export function resolveCatalogAmount(
	item: CatalogItem,
	targetCurrency: string = "THB",
): number | undefined {
	const upper = targetCurrency.toUpperCase();
	if (item.defaultAmounts[upper] !== undefined) {
		return item.defaultAmounts[upper];
	}
	// Fallback conversion between USD and THB (~35 rate) if not directly configured
	if (upper === "THB" && item.defaultAmounts.USD) {
		return Math.round(item.defaultAmounts.USD * 35);
	}
	if (upper === "USD" && item.defaultAmounts.THB) {
		return Math.round((item.defaultAmounts.THB / 35) * 10) / 10;
	}
	// Default to first available amount
	const values = Object.values(item.defaultAmounts).filter((v): v is number => typeof v === "number");
	return values[0];
}

/**
 * Searches the preset catalog using case-insensitive substring and alias matching.
 */
export function searchCatalog(
	query: string,
	filterType?: "subscription" | "hardware" | "career" | "revenue",
): CatalogItem[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [];

	return CATALOG_PRESETS.filter((item) => {
		if (filterType && item.type !== filterType) {
			return false;
		}
		const nameMatch = item.name.toLowerCase().includes(trimmed);
		const aliasMatch = item.aliases.some((a) => a.toLowerCase().includes(trimmed));
		const domainMatch = item.domain ? item.domain.toLowerCase().includes(trimmed) : false;
		return nameMatch || aliasMatch || domainMatch;
	});
}

/**
 * Finds the single best matching catalog preset for an input name.
 */
export function findBestCatalogMatch(
	query: string,
	filterType?: "subscription" | "hardware" | "career" | "revenue",
): CatalogItem | null {
	const results = searchCatalog(query, filterType);
	if (results.length === 0) return null;

	const trimmed = query.trim().toLowerCase();
	// Exact alias or name match gets first priority
	const exactMatch = results.find(
		(r) =>
			r.name.toLowerCase() === trimmed ||
			r.aliases.some((a) => a.toLowerCase() === trimmed),
	);
	if (exactMatch) return exactMatch;

	// Prefix match gets second priority
	const prefixMatch = results.find(
		(r) =>
			r.name.toLowerCase().startsWith(trimmed) ||
			r.aliases.some((a) => a.toLowerCase().startsWith(trimmed)),
	);
	return prefixMatch || results[0] || null;
}
