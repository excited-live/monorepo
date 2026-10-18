import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { EmptyCard, ItemRow, SectionHeader } from "../../../../components";
import type { CapitalTransfer, RecurringSubscription } from "@excited-live/accounting";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface ManagementExpenseSectionProps {
	isPersonal: boolean;
	entitySubs: RecurringSubscription[];
	outgoingTransfers: CapitalTransfer[];
	totalMonthlyExpenses: number;
	lang?: MobileLocale;
	onAddExpense?: () => void;
	onEditExpense?: (sub: RecurringSubscription) => void;
	onSelectTransfer?: (transfer: CapitalTransfer) => void;
}

export const ManagementExpenseSection: React.FC<ManagementExpenseSectionProps> = ({
	isPersonal,
	entitySubs,
	outgoingTransfers,
	totalMonthlyExpenses,
	lang = "en",
	onAddExpense = () => {},
	onEditExpense = () => {},
	onSelectTransfer = () => {},
}) => {
	return (
		<Stack gap={2} width="100%">
			<SectionHeader
				title={`Monthly Burn: ฿${formatMoney(totalMonthlyExpenses)}/mo`}
				subtitle={
					isPersonal
						? "Recurring expenses & capital deployed to businesses"
						: "Recurring operational commitments & services"
				}
				actions={<Button label={t("action.addExpense", lang)} size="sm" variant="primary" onClick={onAddExpense} />}
			/>

			{entitySubs.length === 0 && (!isPersonal || outgoingTransfers.length === 0) ? (
				<EmptyCard>No expenses registered for this entity.</EmptyCard>
			) : (
				<Stack gap={2} width="100%">
					{entitySubs.map((sub) => (
						<ItemRow
							key={sub.id}
							name={sub.name}
							imageUrl={sub.imageUrl}
							sub={`Billed ${sub.cycle} • Due day ${sub.nextRenewalDate?.slice(8) || "01"} • ${sub.category}`}
							amount={`-฿${formatMoney(sub.amount)}`}
							tone="negative"
							badge={sub.cycle.toUpperCase()}
							badgeTone="negative"
							onClick={() => onEditExpense(sub)}
						/>
					))}

					{/* Outgoing Capital Transfers (treated as expenses for personal) */}
					{isPersonal &&
						outgoingTransfers.map((tItem) => (
							<ItemRow
								key={tItem.id}
								name={tItem.note || "Capital Deployed"}
								fallback="CI"
								sub={`Seed to business • ${tItem.date}`}
								amount={`-฿${formatMoney(tItem.amount)}`}
								tone="negative"
								badge="CAPITAL"
								badgeTone="negative"
								onClick={() => onSelectTransfer(tItem)}
							/>
						))}
				</Stack>
			)}
		</Stack>
	);
};
