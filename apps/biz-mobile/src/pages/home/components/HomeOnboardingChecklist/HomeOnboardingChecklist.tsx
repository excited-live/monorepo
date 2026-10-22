import React, { useEffect, useRef, useState } from "react";
import { PlainButton } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
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
import type { OnboardingMethod } from "../../../../service/onboarding/onboarding.api";
import { OnboardingAgentSetup } from "../OnboardingAgentSetup";
import { OnboardingMethodChooser } from "../OnboardingMethodChooser";

export interface HomeOnboardingChecklistProps {
	/** Persisted setup path: chooser when null, manual stepper or agent setup after. */
	method: OnboardingMethod | null;
	onSelectMethod: (method: OnboardingMethod) => void;
	steps: OnboardingStepView[];
	activeIndex: number;
	isComplete: boolean;
	completedCount: number;
	onCompleteStep: (id: OnboardingStepId) => void;
	onSkipStep: (id: OnboardingStepId) => void;
	/** Clear a skip and jump into the step's editor. */
	onReopenStep: (id: OnboardingStepId) => void;
	onAddEntry: (id: OnboardingStepId, entityId: string) => void;
	onEditEntry: (id: OnboardingStepId, entryId: string, entityId: string) => void;
	/** MCP endpoint shown to agents. */
	mcpUrl: string;
	/** Webapp origin for link sign-in; null hides those options. */
	webappUrl: string | null;
	onCreateAgentKey: (agentId: string) => Promise<string>;
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

/**
 * Horizontal, one-step-at-a-time onboarding stepper. The bar is pure
 * navigation/progress; below it only the viewed step's panel renders. When
 * every step is done or skipped the whole section disappears.
 */
export const HomeOnboardingChecklist: React.FC<HomeOnboardingChecklistProps> = ({
	method,
	onSelectMethod,
	steps,
	activeIndex,
	isComplete,
	completedCount,
	onCompleteStep,
	onSkipStep,
	onReopenStep,
	onAddEntry,
	onEditEntry,
	mcpUrl,
	webappUrl,
	onCreateAgentKey,
}) => {
	const { t } = useT();
	const [viewOverride, setViewOverride] = useState<number | null>(null);
	const barRef = useRef<HTMLDivElement | null>(null);

	// The frontier moved (step completed/skipped): follow it, and keep the
	// active step centered in the (horizontally scrollable) bar.
	useEffect(() => {
		setViewOverride(null);
		const items = barRef.current?.querySelectorAll("li");
		items?.[activeIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
	}, [activeIndex]);

	if (isComplete) return null;

	if (method === null) return <OnboardingMethodChooser onSelect={onSelectMethod} />;

	if (method === "agent") {
		return (
			<OnboardingAgentSetup
				steps={steps}
				isComplete={isComplete}
				mcpUrl={mcpUrl}
				webappUrl={webappUrl}
				createAgentKey={onCreateAgentKey}
				onUseManual={() => onSelectMethod("manual")}
			/>
		);
	}

	const viewIndex = viewOverride ?? activeIndex;
	const viewed = steps[viewIndex] ?? steps[Math.max(activeIndex, 0)];
	if (!viewed) return null;

	const statusText = (status: OnboardingStepStatus) =>
		status === "done"
			? t("onboarding.status.done")
			: status === "skipped"
				? t("onboarding.status.skipped")
				: status === "active"
					? t("onboarding.status.upNext")
					: t("onboarding.status.pending");

	const isActive = viewed.status === "active";

	const panel = (
		<Stack
			gap={2}
			width="100%"
			data-testid="onboarding-step-panel"
			className="rounded-2xl border border-line/70 bg-lifted/30 p-3"
		>
			<HStack width="100%" justify="between" align="center" gap={2}>
				<Stack gap={0.5} className="min-w-0 flex-1">
					<Text className="text-[14px] font-semibold text-ink">{viewed.title}</Text>
					<Text className="text-[11px] text-slate">{statusText(viewed.status)}</Text>
				</Stack>
				{viewed.skippable && <Badge variant="neutral" label={t("onboarding.optional")} />}
			</HStack>

			{viewed.entries.length > 0 && (
				<Stack gap={1.5} width="100%">
					{viewed.entries.map((entry) => (
						<EntryRow key={entry.id} entry={entry} onEdit={() => onEditEntry(viewed.id, entry.id, "")} />
					))}
				</Stack>
			)}

			{viewed.sections.map((section) => (
				<Stack
					key={section.entityId}
					gap={1.5}
					width="100%"
					className="rounded-2xl border border-line/60 bg-white/70 p-2.5"
				>
					<HStack width="100%" justify="between" align="center">
						<Text className="text-[12px] font-semibold text-slate">{section.entityName}</Text>
						{isActive && (
							<Button
								label={t("onboarding.action.add")}
								variant="secondary"
								size="sm"
								onClick={() => onAddEntry(viewed.id, section.entityId)}
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
								onEdit={() => onEditEntry(viewed.id, entry.id, section.entityId)}
							/>
						))
					)}
				</Stack>
			))}

			{isActive && viewed.id === "add_business" && (
				<Button
					label={t("onboarding.action.add")}
					variant="secondary"
					size="sm"
					onClick={() => onAddEntry(viewed.id, "")}
				/>
			)}

			{isActive && !viewed.canComplete && (
				<Text className="text-[11px] text-slate">{t("onboarding.hint.addFirst")}</Text>
			)}

			{isActive && (
				<HStack gap={2}>
					<Button
						label={t("onboarding.action.done")}
						variant="primary"
						size="sm"
						isDisabled={!viewed.canComplete}
						onClick={() => onCompleteStep(viewed.id)}
					/>
					{viewed.skippable && (
						<Button
							label={t("onboarding.action.skip")}
							variant="secondary"
							size="sm"
							onClick={() => onSkipStep(viewed.id)}
						/>
					)}
				</HStack>
			)}

			{viewed.status === "skipped" && (
				<Button
					label={t("onboarding.action.setupNow")}
					variant="secondary"
					size="sm"
					onClick={() => onReopenStep(viewed.id)}
				/>
			)}
		</Stack>
	);

	return (
		<SectionCard
			title="Onboarding Checklist"
			badge={<Badge label={`${completedCount} of ${steps.length}`} variant="neutral" />}
		>
			<Stack gap={3} width="100%">
				<div ref={barRef} className="w-full overflow-x-auto pb-1">
					<Stepper
						activeStep={activeIndex}
						orientation="horizontal"
						density="compact"
						label="Onboarding progress"
						className="min-w-[540px] [&_span]:whitespace-nowrap"
						onStepClick={(index) => setViewOverride(index === activeIndex ? null : index)}
					>
						{steps.map((step, index) => (
							<Step
								key={step.id}
								step={index}
								label={step.shortTitle}
								status={
									step.status === "done"
										? "success"
										: step.status === "skipped"
											? "warning"
											: undefined
								}
								isDisabled={index > activeIndex}
							/>
						))}
					</Stepper>
				</div>

				{panel}

				<PlainButton
					type="button"
					onClick={() => onSelectMethod("agent")}
					className="cursor-pointer self-start text-[12px] font-medium text-slate underline underline-offset-2 active:text-ink"
				>
					{t("onboarding.agent.useAgent")}
				</PlainButton>
			</Stack>
		</SectionCard>
	);
};
