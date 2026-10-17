import React from "react";
import { HStack, Img, Text } from "@excited-live/design-system";

export interface EntityThumbProps {
	imageUrl?: string;
	/** Used for the image alt text and the initials fallback. */
	name: string;
	/** Tailwind size + radius classes, defaults to the 44px list thumb. */
	className?: string;
}

/** Rounded square thumbnail showing an image, or the name's initials when there is none. */
export const EntityThumb: React.FC<EntityThumbProps> = ({
	imageUrl,
	name,
	className = "size-11 min-w-11 rounded-[12px]",
}) => (
	<HStack
		justify="center"
		align="center"
		className={`shrink-0 overflow-hidden border border-line bg-ink/5 ${className}`}
	>
		{imageUrl ? (
			<Img src={imageUrl} alt={name} className="block size-full object-cover" />
		) : (
			<Text className="text-[13px] font-bold uppercase text-granite">{name.slice(0, 2)}</Text>
		)}
	</HStack>
);
