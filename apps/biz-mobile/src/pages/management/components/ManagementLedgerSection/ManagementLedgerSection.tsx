import React from "react";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { EmptyCard, ItemRow } from "../../../../components";
import type { LedgerActionItem } from "@excited-live/accounting";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementLedgerSectionProps {
	monthActions: LedgerActionItem[];
	selectedMonth: string;
	lang?: MobileLocale;
}

export const ManagementLedgerSection: React.FC<ManagementLedgerSectionProps> = ({
	monthActions,
	selectedMonth,
	lang = "en",
}) => {
	return (
		<Stack gap={2} width="100%">
			<Text className="text-[12px] font-bold uppercase tracking-wider text-slate">
				{t("ledger.actions", lang, {
					count: monthActions.length,
					month: selectedMonth,
				})}
			</Text>

			{monthActions.length === 0 ? (
				<EmptyCard>{t("ledger.empty", lang)}</EmptyCard>
			) : (
				<Stack gap={2} width="100%">
					{monthActions.map((action) => (
						<ItemRow
							key={action.id}
							name={action.title}
							glyph={action.type === "inflow" ? "↓" : action.type === "outflow" ? "↑" : "⚡"}
							sub={`${action.date} • ${action.category ? action.category.replace(/_/g, " ") : action.type}`}
							amount={`${action.amount > 0 ? "+" : ""}฿${formatMoney(Math.abs(action.amount))}`}
							tone={action.amount > 0 ? "positive" : "negative"}
							badge={action.type.toUpperCase()}
							badgeTone={action.type === "inflow" ? "positive" : "negative"}
						/>
					))}
				</Stack>
			)}
		</Stack>
	);
};
