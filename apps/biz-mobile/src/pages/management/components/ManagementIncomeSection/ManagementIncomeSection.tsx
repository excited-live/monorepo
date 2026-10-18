import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { EmptyCard, ItemRow, SectionHeader } from "../../../../components";
import type { EntityAccount, RevenueStream } from "@excited-live/accounting";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementIncomeSectionProps {
	isPersonal: boolean;
	activeAccount: EntityAccount;
	entityRev: RevenueStream[];
	totalIncome: number;
	hasConfiguredSalary: boolean;
	lang?: MobileLocale;
	onInjectCapital?: () => void;
	onAddIncome?: () => void;
	onEditIncome?: (rev: RevenueStream) => void;
}

export const ManagementIncomeSection: React.FC<ManagementIncomeSectionProps> = ({
	isPersonal,
	activeAccount,
	entityRev,
	totalIncome,
	hasConfiguredSalary,
	lang = "en",
	onInjectCapital = () => {},
	onAddIncome = () => {},
	onEditIncome = () => {},
}) => {
	return (
		<Stack gap={2} width="100%">
			<SectionHeader
				title={
					isPersonal ? `Monthly Income: ฿${formatMoney(totalIncome)}/mo` : `Total MRR: ฿${formatMoney(totalIncome)}/mo`
				}
				subtitle={isPersonal ? "Base salary and operational income" : "Monthly recurring revenues and subscriptions"}
				actions={
					<>
						{!isPersonal && (
							<Button label={t("action.injectCapital", lang)} size="sm" variant="secondary" onClick={onInjectCapital} />
						)}
						<Button label={t("action.addIncome", lang)} size="sm" variant="primary" onClick={onAddIncome} />
					</>
				}
			/>

			{/* Base Salary Card (Personal Mode only, if set) */}
			{isPersonal && activeAccount.salary && !hasConfiguredSalary && (
				<ItemRow
					name="Primary Career Income"
					fallback="💼"
					sub={`Payday Day ${activeAccount.paydayDayOfMonth ?? 28} • Net Monthly`}
					amount={`+฿${formatMoney(activeAccount.salary)}`}
					tone="positive"
					badge="SALARY"
					badgeTone="positive"
				/>
			)}

			{entityRev.length === 0 && (!isPersonal || !activeAccount.salary) ? (
				<EmptyCard>No income streams registered for this entity.</EmptyCard>
			) : (
				<Stack gap={2} width="100%">
					{entityRev.map((rev) => (
						<ItemRow
							key={rev.id}
							name={rev.name}
							imageUrl={rev.imageUrl}
							sub={`${rev.source.replace(/_/g, " ")} • ${rev.frequency}`}
							amount={`+฿${formatMoney(rev.amount)}`}
							tone="positive"
							badge={rev.source === "salary" ? "SALARY" : "MONTHLY"}
							badgeTone="positive"
							onClick={() => onEditIncome(rev)}
						/>
					))}
				</Stack>
			)}
		</Stack>
	);
};
