import React from "react";
import { Img, Stack } from "@excited-live/design-system";

export const HomeHeroBackground: React.FC = () => (
	<Stack
		justify="end"
		className="relative -mx-4 mt-[calc(-1*(56px+max(0px,env(safe-area-inset-top)-14px)))] h-[calc(275px+max(0px,env(safe-area-inset-top)))] w-[calc(100%+32px)] shrink-0 overflow-hidden bg-[#ece1d1]"
	>
		<Img
			src="/hero-banner.webp"
			alt="Solopreneur Business Treasury"
			className="block h-[275px] w-full shrink-0 object-cover object-[center_38%]"
		/>
		<Stack className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(243,240,238,0.35)_0%,rgba(243,240,238,0.02)_25%,rgba(20,20,19,0.04)_70%,rgba(252,251,250,0.5)_100%)]" />
	</Stack>
);
