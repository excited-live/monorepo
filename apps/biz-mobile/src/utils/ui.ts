import type { EntityAccount } from "@excited-live/accounting";

/** Frosted cream glass used by floating pills (header chips, steppers, switchers). */
export const GLASS_PILL =
	"rounded-pill border border-white/50 bg-lifted/70 backdrop-blur-[16px] backdrop-saturate-[160%] shadow-[0_2px_8px_rgba(20,20,19,0.03)]";

export type Tone = "positive" | "negative" | "neutral";

/** Pale tinted pill per tone, for Badge `className` (Astryx badges are solid by default). */
export const BADGE_TONE_CLASS: Record<Tone, string> = {
	positive: "bg-[#0a8a4d]/[0.08] text-[#0a8a4d]",
	negative: "bg-signal/[0.08] text-signal",
	neutral: "bg-ink/[0.06] text-granite",
};

/**
 * Image behind the floating capital hero card: for a personal account the career cover,
 * then the entity image, then the user's avatar; for a business account its own image.
 * `undefined` means the generated dark brand cover is drawn instead.
 */
export const heroBackgroundImage = (account: EntityAccount, avatarUrl?: string): string | undefined =>
	account.type === "personal" ? account.careerImageUrl || account.imageUrl || avatarUrl : account.imageUrl;
