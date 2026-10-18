import React from "react";
import { PlainButton } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";
import { useT } from "../../../../application/hooks/useT";
import type {
	OnboardingEntryView,
	OnboardingStepId,
	OnboardingStepStatus,
	OnboardingStepView,
} from "../../../../domain/onboarding";

export interface HomeOnboardingChecklistProps {
	steps: OnboardingStepView[];
	activeIndex: number;
	isComplete: boolean;
	completedCount: number;
	/** Stepper click: reopen the step (works for done, skipped and current steps). */
	onStepClick: (index: number) => void;
	onCompleteStep: (id: OnboardingStepId) => void;
	onSkipStep: (id: OnboardingStepId) => void;
	/** Clear a skip and jump into the step's editor. */
	onReopenStep: (id: OnboardingStepId) => void;
	onAddEntry: (id: OnboardingStepId, entityId: string) => void;
	onEditEntry: (id: OnboardingStepId, entryId: string, entityId: string) => void;
}

const EntryRow: React.FC<{ entry: OnboardingEntryView; onEdit: () => void }> = ({ entry, onEdit }) => (
	<PlainButton
		type="button"
		onClick={onEdit}
		className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-line/60 bg-white px-2.5 py-2 text-left active:bg-lifted/60"
	>
		<Text maxLines={1} className="text-[12px] font-medium text-ink">
			{entry.label}
		</Text>
		{entry.meta ? <Text className="shrink-0 text-[11px] text-slate">฿{entry.meta}</Text> : null}
	</PlainButton>
);

export const HomeOnboardingChecklist: React.FC<HomeOnboardingChecklistProps> = ({
	steps,
	activeIndex,
	isComplete,
	completedCount,
	onStepClick,
	onCompleteStep,
	onSkipStep,
	onReopenStep,
	onAddEntry,
	onEditEntry,
}) => {
	const { t } = useT();

	const statusText = (status: OnboardingStepStatus) =>
		status === "done"
			? t("onboarding.status.done")
			: status === "skipped"
				? t("onboarding.status.skipped")
				: status === "active"
					? t("onboarding.status.upNext")
					: t("onboarding.status.pending");

	return (
		<SectionCard
			title="Onboarding Checklist"
			badge={<Badge label={`${completedCount} of ${steps.length}`} variant="neutral" />}
		>
			<Stack gap={3} width="100%">
				{isComplete ? (
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

				<Stepper
					activeStep={activeIndex === -1 ? steps.length : activeIndex}
					orientation="vertical"
					density="compact"
					label="Onboarding progress"
					onStepClick={onStepClick}
				>
					{steps.map((step, index) => {
						const isActive = step.status === "active";
						const isFuture = activeIndex !== -1 && index > activeIndex;
						return (
							<Step
								key={step.id}
								step={index}
								label={step.title}
								description={statusText(step.status)}
								status={
									step.status === "done"
										? "success"
										: step.status === "skipped"
											? "warning"
											: undefined
								}
								isOptional={step.skippable}
								isDisabled={isFuture}
							>
								<Stack gap={2} width="100%" className="pb-1">
									{step.entries.length > 0 && (
										<Stack gap={1.5} width="100%">
											{step.entries.map((entry) => (
												<EntryRow
													key={entry.id}
													entry={entry}
													onEdit={() => onEditEntry(step.id, entry.id, "")}
												/>
											))}
										</Stack>
									)}

									{step.sections.map((section) => (
										<Stack
											key={section.entityId}
											gap={1.5}
											width="100%"
											className="rounded-2xl border border-line/60 bg-lifted/30 p-2.5"
										>
											<HStack width="100%" justify="between" align="center">
												<Text className="text-[12px] font-semibold text-slate">
													{section.entityName}
												</Text>
												{isActive && (
													<Button
														label={t("onboarding.action.add")}
														variant="secondary"
														size="sm"
														onClick={() => onAddEntry(step.id, section.entityId)}
													/>
												)}
											</HStack>
											{section.entries.length === 0 ? (
												<Text className="text-[11px] text-slate">{t("onboarding.empty")}</Text>
											) : (
												section.entries.map((entry) => (
													<EntryRow
														key={entry.id}
														entry={entry}
														onEdit={() => onEditEntry(step.id, entry.id, section.entityId)}
													/>
												))
											)}
										</Stack>
									))}

									{isActive && step.id === "add_business" && (
										<Button
											label={t("onboarding.action.add")}
											variant="secondary"
											size="sm"
											onClick={() => onAddEntry(step.id, "")}
										/>
									)}

									{isActive && !step.canComplete && (
										<Text className="text-[11px] text-slate">{t("onboarding.hint.addFirst")}</Text>
									)}

									{isActive && (
										<HStack gap={2}>
											<Button
												label={t("onboarding.action.done")}
												variant="primary"
												size="sm"
												isDisabled={!step.canComplete}
												onClick={() => onCompleteStep(step.id)}
											/>
											{step.skippable && (
												<Button
													label={t("onboarding.action.skip")}
													variant="secondary"
													size="sm"
													onClick={() => onSkipStep(step.id)}
												/>
											)}
										</HStack>
									)}

									{step.status === "skipped" && (
										<Button
											label={t("onboarding.action.setupNow")}
											variant="secondary"
											size="sm"
											onClick={() => onReopenStep(step.id)}
										/>
									)}
								</Stack>
							</Step>
						);
					})}
				</Stepper>
			</Stack>
		</SectionCard>
	);
};
