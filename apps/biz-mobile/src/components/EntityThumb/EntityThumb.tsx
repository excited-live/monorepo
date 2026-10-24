import React from "react";
import {
	BoxIcon,
	BriefcaseIcon,
	BuildingIcon,
	CardIcon,
	ChartIcon,
	Img,
	ReceiptIcon,
	WalletIcon,
	type IconProps,
} from "@excited-live/design-system";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";

export type EntityThumbKind = "wallet" | "gear" | "investment" | "income" | "expense" | "liability" | "business";

/** Generated tile per record kind: icon on a kind tint, used when there is no image. */
const KIND_STYLES: Record<EntityThumbKind, { Icon: React.ComponentType<IconProps>; bgClass: string; fgClass: string }> = {
	wallet: { Icon: WalletIcon, bgClass: "bg-[#0a8a4d]/[0.08]", fgClass: "text-[#0a8a4d]" },
	gear: { Icon: BoxIcon, bgClass: "bg-ink/[0.06]", fgClass: "text-granite" },
	investment: { Icon: ChartIcon, bgClass: "bg-[#0a8a4d]/[0.08]", fgClass: "text-[#0a8a4d]" },
	income: { Icon: BriefcaseIcon, bgClass: "bg-[#0a8a4d]/[0.08]", fgClass: "text-[#0a8a4d]" },
	expense: { Icon: ReceiptIcon, bgClass: "bg-signal/[0.08]", fgClass: "text-signal" },
	liability: { Icon: CardIcon, bgClass: "bg-signal/[0.08]", fgClass: "text-signal" },
	business: { Icon: BuildingIcon, bgClass: "bg-ink/[0.06]", fgClass: "text-granite" },
};

export interface EntityThumbProps {
	imageUrl?: string;
	/** Used for the image alt text and the initials fallback. */
	name: string;
	/** Record kind; draws a generated kind tile when there is no image. */
	kind?: EntityThumbKind;
	/** Tailwind size + radius classes, defaults to the 44px list thumb. */
	className?: string;
}

/** Rounded square thumbnail showing an image, a generated kind tile, or the name's initials. */
export const EntityThumb: React.FC<EntityThumbProps> = ({
	imageUrl,
	name,
	kind,
	className = "size-11 min-w-11 rounded-[12px]",
}) => {
	const kindStyle = kind ? KIND_STYLES[kind] : undefined;
	const KindIcon = kindStyle?.Icon;
	return (
		<HStack
			justify="center"
			align="center"
			className={`shrink-0 overflow-hidden border border-line ${kindStyle?.bgClass ?? "bg-ink/5"} ${className}`}
		>
			{imageUrl ? (
				<Img src={imageUrl} alt={name} className="block size-full object-cover" />
			) : KindIcon ? (
				<KindIcon aria-hidden="true" className={`size-1/2 ${kindStyle?.fgClass ?? ""}`} />
			) : (
				<Text className="text-[13px] font-bold uppercase text-granite">{name.slice(0, 2)}</Text>
			)}
		</HStack>
	);
};
