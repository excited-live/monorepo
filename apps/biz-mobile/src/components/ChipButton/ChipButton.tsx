import React from "react";
import { PlainButton, type PlainButtonProps } from "@excited-live/design-system";

/** Small white pill button used for presets and autofill suggestions. */
export const ChipButton: React.FC<PlainButtonProps> = ({ className = "", ...props }) => (
	<PlainButton
		className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-line bg-white px-2.5 py-[5px] text-[11.5px] font-semibold text-ink shadow-[0_1px_3px_rgba(20,20,19,0.04)] transition-colors duration-150 active:bg-ink active:text-white ${className}`}
		{...props}
	/>
);
