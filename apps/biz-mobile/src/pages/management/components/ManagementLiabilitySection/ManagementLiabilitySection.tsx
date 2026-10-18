import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { EmptyCard, ItemRow, SectionHeader } from "../../../../components";
import type { LiabilityStream } from "@excited-live/accounting";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementLiabilitySectionProps {
	entityLiab: LiabilityStream[];
	totalMonthlyLiabilities: number;
	lang?: MobileLocale;
	onRegisterLiability?: () => void;
	onSelectLiability?: (liab: LiabilityStream) => void;
}

export const ManagementLiabilitySection: React.FC<ManagementLiabilitySectionProps> = ({
	entityLiab,
	totalMonthlyLiabilities,
	lang = "en",
	onRegisterLiability = () => {},
	onSelectLiability = () => {},
}) => {
	return (
		<Stack gap={2} width="100%">
			<SectionHeader
				title="Liabilities & Debt Payments"
				subtitle={`Total Monthly Payments: ฿${formatMoney(totalMonthlyLiabilities)}/mo`}
				actions={
					<Button
						label={t("action.registerLiability", lang)}
						size="sm"
						variant="primary"
						onClick={onRegisterLiability}
					/>
				}
			/>

			{entityLiab.length === 0 ? (
				<EmptyCard>No liabilities registered for this entity.</EmptyCard>
			) : (
				<Stack gap={2} width="100%">
					{entityLiab.map((liab) => (
						<ItemRow
							key={liab.id}
							name={liab.name}
							imageUrl={liab.imageUrl}
							fallback="💳"
							sub={`Debt Payment • ${liab.category.replace(/_/g, " ")}`}
							amount={`-฿${formatMoney(liab.amount)}`}
							tone="negative"
							badge="DEBT"
							badgeTone="negative"
							onClick={() => onSelectLiability(liab)}
						/>
					))}
				</Stack>
			)}
		</Stack>
	);
};
