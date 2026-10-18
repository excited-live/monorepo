import React from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";

export interface HomeOnboardingChecklistProps {
	onUpdatePersonalWallet: () => void;
	onAddCareer: () => void;
	onAddExpense: () => void;
	onAddAssets: () => void;
	onAddLiability: () => void;
	onAddFirstBusiness: () => void;
	isWalletDone: boolean;
	isCareerDone: boolean;
	isExpenseDone: boolean;
	isAssetsDone: boolean;
	isLiabilityDone: boolean;
	isBusinessDone: boolean;
}

interface StepItem {
	id: string;
	title: string;
	isDone: boolean;
	action?: () => void;
	actionLabel?: string;
}

export const HomeOnboardingChecklist: React.FC<HomeOnboardingChecklistProps> = ({
	onUpdatePersonalWallet,
	onAddCareer,
	onAddExpense,
	onAddAssets,
	onAddLiability,
	onAddFirstBusiness,
	isWalletDone,
	isCareerDone,
	isExpenseDone,
	isAssetsDone,
	isLiabilityDone,
	isBusinessDone,
}) => {
	const steps: StepItem[] = [
		{
			id: "create_account",
			title: "Create Account",
			isDone: true,
		},
		{
			id: "update_wallet",
			title: "Update Detail for Personal default Wallet",
			isDone: isWalletDone,
			action: onUpdatePersonalWallet,
			actionLabel: "Configure Wallet",
		},
		{
			id: "add_career",
			title: "Add career",
			isDone: isCareerDone,
			action: onAddCareer,
			actionLabel: "Add Career",
		},
		{
			id: "add_expense",
			title: "Add Expense",
			isDone: isExpenseDone,
			action: onAddExpense,
			actionLabel: "Add Expense",
		},
		{
			id: "add_assets",
			title: "Add Assets",
			isDone: isAssetsDone,
			action: onAddAssets,
			actionLabel: "Add Asset",
		},
		{
			id: "add_liability",
			title: "Add Liability (or option to say I dont have)",
			isDone: isLiabilityDone,
			action: onAddLiability,
			actionLabel: "Add Liability",
		},
		{
			id: "add_first_business",
			title: "Add First Business",
			isDone: isBusinessDone,
			action: onAddFirstBusiness,
			actionLabel: "Create Business",
		},
	];

	const completedCount = steps.filter((s) => s.isDone).length;
	const isAllDone = completedCount === steps.length;

	// Find the first unfinished step to mark as "Up next"
	const firstUnfinishedIdx = steps.findIndex((s) => !s.isDone);

	return (
		<SectionCard
			title="Onboarding Checklist"
			badge={
				<Badge
					label={`${completedCount} of ${steps.length}`}
					variant="neutral"
				/>
			}
		>
			<Stack gap={3} width="100%">
				{isAllDone ? (
					<Card padding={3} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
						<HStack gap={3} align="center">
							<Text weight="bold" className="text-emerald-700 dark:text-emerald-300 text-[14px]">
								✓ Onboarding Complete! Your Financial OS is Ready.
							</Text>
						</HStack>
					</Card>
				) : (
					<Text className="text-[13px] text-slate">
						Complete these foundational steps to set up your financial operating system.
					</Text>
				)}

				<Stack gap={2} width="100%">
					{steps.map((step, idx) => {
						const isUpNext = idx === firstUnfinishedIdx;
						const statusLabel = step.isDone ? "Done already" : isUpNext ? "Up next" : "Pending";

						return (
							<HStack
								key={step.id}
								justify="between"
								align="center"
								className={`p-3 rounded-2xl border transition-all ${
									step.isDone
										? "bg-lifted/60 border-line text-slate"
										: isUpNext
											? "bg-card border-primary/40 shadow-sm"
											: "bg-lifted/30 border-line/50 opacity-70"
								}`}
							>
								<HStack gap={3} align="center" className="min-w-0 flex-1">
									<div
										className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
											step.isDone
												? "bg-emerald-500 text-white"
												: isUpNext
													? "bg-primary text-white"
													: "bg-slate/20 text-slate"
										}`}
									>
										{step.isDone ? "✓" : idx + 1}
									</div>
									<Stack gap={0} className="min-w-0 flex-1">
										<Text
											weight={isUpNext ? "bold" : "medium"}
											className={`text-[13px] truncate ${step.isDone ? "line-through text-slate" : ""}`}
										>
											{step.title}
										</Text>
										<Text className="text-[11px] text-slate">
											{statusLabel}
										</Text>
									</Stack>
								</HStack>

								{step.action && !step.isDone && (
									<Button
										label={step.title}
															variant={isUpNext ? "primary" : "secondary"}
										onClick={step.action}
									/>
								)}
							</HStack>
						);
					})}
				</Stack>
			</Stack>
		</SectionCard>
	);
};
