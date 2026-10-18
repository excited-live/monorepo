import React from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface HomeTreasuryPanelProps {
	totalTreasury: number;
	totalEomTreasury: number;
	personalCash: number;
	businessCash: number;
	lang: MobileLocale;
}

const BalanceChip: React.FC<{ label: string; value: number }> = ({ label, value }) => (
	<HStack
		gap={1.5}
		align="center"
		className="rounded-pill border border-line bg-white px-3 py-[5px] shadow-[0_1px_4px_rgba(20,20,19,0.03)]"
	>
		<Text className="text-[12px] font-medium text-slate">{label}:</Text>
		<Text className="text-[12px] font-bold text-ink">฿{formatMoney(value)}</Text>
	</HStack>
);

export const HomeTreasuryPanel: React.FC<HomeTreasuryPanelProps> = ({
	totalTreasury,
	totalEomTreasury,
	personalCash,
	businessCash,
	lang,
}) => (
	<Stack gap={1} className="border-b border-line pb-[18px]">
		<HStack gap={1.5} align="center">
			<Text className="text-[14px] leading-none text-signal">•</Text>
			<Text className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate">
				{t("home.consolidated", lang)}
			</Text>
		</HStack>
		<HStack gap={1} className="mt-0.5 items-baseline leading-[1.15] tracking-[-0.03em]">
			<Text className="text-[clamp(21px,6vw,26px)] font-bold text-slate">฿</Text>
			<Text className="text-[clamp(26px,7.5vw,32px)] font-extrabold text-ink">{formatMoney(totalTreasury)}</Text>
			<Text className="ml-1.5 text-[13px] font-semibold tracking-normal text-slate">
				(end of month ฿{formatMoney(totalEomTreasury)})
			</Text>
		</HStack>
		<HStack gap={2} wrap="wrap" className="mt-2.5">
			<BalanceChip label={t("home.personal", lang)} value={personalCash} />
			<BalanceChip label={t("home.businesses", lang)} value={businessCash} />
		</HStack>
	</Stack>
);
