export interface CatalogItem {
	id: string;
	name: string;
	aliases: string[];
	type: "subscription" | "hardware" | "career" | "revenue" | "liability";
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

	// ==========================================
	// WORK EQUIPMENT & HARDWARE (DEPRECIATING ASSETS)
	// ==========================================
	{
		id: "gear_macbook_pro",
		name: "MacBook Pro 14\"",
		aliases: ["macbook pro", "macbook", "mbp", "apple laptop", "แมคบุ๊ก"],
		type: "hardware",
		category: "workstation",
		defaultAmounts: { THB: 89900, USD: 2499 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Apple silicon pro laptop",
	},
	{
		id: "gear_macbook_air",
		name: "MacBook Air 13\"",
		aliases: ["macbook air", "mba", "apple air", "แมคบุ๊กแอร์"],
		type: "hardware",
		category: "workstation",
		defaultAmounts: { THB: 39900, USD: 1099 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Lightweight Apple laptop",
	},
	{
		id: "gear_mac_mini",
		name: "Mac mini",
		aliases: ["mac mini", "apple desktop", "มาคมินิ"],
		type: "hardware",
		category: "workstation",
		defaultAmounts: { THB: 22900, USD: 599 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Compact desktop workstation",
	},
	{
		id: "gear_ultrasharp_monitor",
		name: "Dell UltraSharp Monitor",
		aliases: ["ultrasharp", "dell monitor", "4k monitor", "external monitor", "จอมอนิเตอร์"],
		type: "hardware",
		category: "workstation",
		defaultAmounts: { THB: 24900, USD: 699 },
		domain: "dell.com",
		imageUrl: resolveFaviconUrl("dell.com"),
		notes: "27-inch 4K work display",
	},
	{
		id: "gear_ipad_pro",
		name: "iPad Pro",
		aliases: ["ipad", "ipad pro", "tablet", "ไอแพด"],
		type: "hardware",
		category: "mobile",
		defaultAmounts: { THB: 39900, USD: 1099 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Tablet for sketching & review",
	},
	{
		id: "gear_iphone_pro",
		name: "iPhone Pro",
		aliases: ["iphone", "iphone pro", "apple phone", "ไอโฟน"],
		type: "hardware",
		category: "mobile",
		defaultAmounts: { THB: 42900, USD: 1199 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Primary work phone",
	},
	{
		id: "gear_sony_xm_headphones",
		name: "Sony WH-1000XM Headphones",
		aliases: ["sony xm5", "wh-1000xm5", "sony headphones", "noise cancelling headphones", "หูฟังโซนี่"],
		type: "hardware",
		category: "audio",
		defaultAmounts: { THB: 12900, USD: 399 },
		domain: "sony.com",
		imageUrl: resolveFaviconUrl("sony.com"),
		notes: "Noise-cancelling headphones",
	},
	{
		id: "gear_airpods_pro",
		name: "AirPods Pro",
		aliases: ["airpods", "airpods pro", "apple earbuds", "แอร์พอด"],
		type: "hardware",
		category: "audio",
		defaultAmounts: { THB: 8990, USD: 249 },
		domain: "apple.com",
		imageUrl: resolveFaviconUrl("apple.com"),
		notes: "Compact earbuds for calls",
	},
	{
		id: "gear_shure_sm7b",
		name: "Shure SM7B Microphone",
		aliases: ["sm7b", "shure microphone", "podcast mic", "ไมค์ชัวร์"],
		type: "hardware",
		category: "audio",
		defaultAmounts: { THB: 17900, USD: 399 },
		domain: "shure.com",
		imageUrl: resolveFaviconUrl("shure.com"),
		notes: "Broadcast dynamic microphone",
	},
	{
		id: "gear_aeron_chair",
		name: "Herman Miller Aeron",
		aliases: ["aeron", "herman miller", "office chair", "ergonomic chair", "เก้าอี้ทำงาน"],
		type: "hardware",
		category: "furniture",
		defaultAmounts: { THB: 59900, USD: 1795 },
		domain: "hermanmiller.com",
		imageUrl: resolveFaviconUrl("hermanmiller.com"),
		notes: "Ergonomic work chair",
	},
	{
		id: "gear_standing_desk",
		name: "Electric Standing Desk",
		aliases: ["standing desk", "sit stand desk", "height adjustable desk", "โต๊ะทำงาน"],
		type: "hardware",
		category: "furniture",
		defaultAmounts: { THB: 15900, USD: 499 },
		domain: "ikea.com",
		imageUrl: resolveFaviconUrl("ikea.com"),
		notes: "Height-adjustable desk",
	},
	{
		id: "gear_monitor_arm",
		name: "Ergotron LX Monitor Arm",
		aliases: ["monitor arm", "ergotron", "ergotron lx", "แขนจอมอนิเตอร์"],
		type: "hardware",
		category: "furniture",
		defaultAmounts: { THB: 4900, USD: 149 },
		domain: "ergotron.com",
		imageUrl: resolveFaviconUrl("ergotron.com"),
		notes: "Desk-mounted display arm",
	},

	// ==========================================
	// INCOME STREAMS & REVENUE SOURCES
	// ==========================================
	{
		id: "rev_stripe",
		name: "Stripe Payout",
		aliases: ["stripe", "stripe mrr", "stripe payments", "stripe income"],
		type: "revenue",
		category: "stripe",
		defaultAmounts: {},
		cycle: "monthly",
		domain: "stripe.com",
		imageUrl: resolveFaviconUrl("stripe.com"),
		notes: "Card & online payment settlements",
	},
	{
		id: "rev_paypal",
		name: "PayPal Payout",
		aliases: ["paypal", "paypal income", "paypal payments"],
		type: "revenue",
		category: "other",
		defaultAmounts: {},
		cycle: "monthly",
		domain: "paypal.com",
		imageUrl: resolveFaviconUrl("paypal.com"),
		notes: "Cross-border payment settlements",
	},
	{
		id: "rev_client_retainer",
		name: "Client Retainer",
		aliases: ["retainer", "client retainer", "monthly retainer", "contract retainer"],
		type: "revenue",
		category: "bank_transfer",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
		notes: "Recurring B2B contract",
	},
	{
		id: "rev_freelance",
		name: "Freelance Project",
		aliases: ["freelance", "freelance project", "side project", "side income", "งานฟรีแลนซ์"],
		type: "revenue",
		category: "freelance",
		defaultAmounts: {},
		imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
		notes: "Project-based side income",
	},
	{
		id: "rev_monthly_salary",
		name: "Monthly Salary",
		aliases: ["salary", "monthly salary", "payroll", "เงินเดือน"],
		type: "revenue",
		category: "salary",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
		notes: "Primary employment income",
	},

	// ==========================================
	// RECURRING DEBT & LIABILITIES
	// ==========================================
	{
		id: "liab_mortgage",
		name: "Home Mortgage",
		aliases: ["mortgage", "home loan", "housing loan", "สินเชื่อบ้าน", "บ้าน"],
		type: "liability",
		category: "mortgage",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
		notes: "Monthly housing repayment",
	},
	{
		id: "liab_car_loan",
		name: "Auto Loan",
		aliases: ["car loan", "auto loan", "vehicle loan", "สินเชื่อรถ", "รถยนต์"],
		type: "liability",
		category: "car_loan",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
		notes: "Vehicle financing installment",
	},
	{
		id: "liab_student_loan",
		name: "Student Loan",
		aliases: ["student loan", "education loan", "กยศ", "สินเชื่อการศึกษา"],
		type: "liability",
		category: "student_loan",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
		notes: "Education financing installment",
	},
	{
		id: "liab_credit_card",
		name: "Credit Card",
		aliases: ["credit card", "card minimum", "personal loan", "บัตรเครดิต"],
		type: "liability",
		category: "credit_card",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
		notes: "Card minimum / revolving debt",
	},
	{
		id: "liab_business_loan",
		name: "Business Loan",
		aliases: ["business loan", "sme loan", "สินเชื่อธุรกิจ"],
		type: "liability",
		category: "business_loan",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
		notes: "Business debt repayment",
	},
	{
		id: "liab_equipment_loan",
		name: "Equipment Financing",
		aliases: ["equipment loan", "equipment financing", "gear financing", "สินเชื่ออุปกรณ์"],
		type: "liability",
		category: "equipment_loan",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
		notes: "Financed work equipment",
	},
	{
		id: "liab_office_lease",
		name: "Office Lease",
		aliases: ["office lease", "commercial lease", "rental", "ค่าเช่าสำนักงาน"],
		type: "liability",
		category: "lease",
		defaultAmounts: {},
		cycle: "monthly",
		imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
		notes: "Commercial space rental",
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
	filterType?: "subscription" | "hardware" | "career" | "revenue" | "liability",
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
	filterType?: "subscription" | "hardware" | "career" | "revenue" | "liability",
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
