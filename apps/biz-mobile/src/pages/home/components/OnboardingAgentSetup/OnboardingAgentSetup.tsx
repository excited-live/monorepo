import React, { useEffect, useMemo, useRef, useState } from "react";
import { PlainButton } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";
import { ModalPage } from "../../../../components/ModalPage";
import { useT } from "../../../../application/hooks/useT";
import { useAppUI } from "../../../../application/hooks/useAppUI";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useCopyToClipboard } from "../../../../hooks/useCopyToClipboard";
import type { OnboardingStepView } from "../../../../domain/onboarding";
import {
	AGENT_KINDS,
	AGENT_OPTIONS,
	availableAgentAuth,
	buildAgentPrompt,
	defaultAgentAuth,
	FEATURED_AGENTS,
	MORE_AGENTS,
	type AgentAuth,
	type AgentOption,
} from "../../../../domain/agents";

export interface OnboardingAgentSetupProps {
	steps: OnboardingStepView[];
	isComplete: boolean;
	mcpUrl: string;
	/** Webapp origin for OAuth / device links; `null` hides those options. */
	webappUrl: string | null;
	/** Mint an API key for the agent and resolve with the one-time secret. */
	createAgentKey: (agentId: string) => Promise<string>;
	onUseManual: () => void;
	/** Test/design seam: preselect an agent instead of the first featured one. */
	initialAgentId?: string;
	initialAuth?: AgentAuth;
}

const initials = (name: string): string => {
	const parts = name.split(/[\s-]+/).filter(Boolean);
	if (parts.length > 1) {
		return parts
			.map((part) => part[0]!)
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
};

const AgentMonogram: React.FC<{ agent: AgentOption }> = ({ agent }) => (
	<HStack
		justify="center"
		align="center"
		className="size-9 shrink-0 rounded-full border border-line/60 bg-ink text-cream"
	>
		<Text className="text-[12px] font-bold text-cream">{initials(agent.name)}</Text>
	</HStack>
);

const CopyButton: React.FC<{ text: string; label: string; copiedLabel: string }> = ({
	text,
	label,
	copiedLabel,
}) => {
	const { state, copy } = useCopyToClipboard();
	return (
		<Button
			label={state === "copied" ? copiedLabel : label}
			variant="secondary"
			size="sm"
			onClick={() => void copy(text)}
		/>
	);
};

const PromptBox: React.FC<{ text: string }> = ({ text }) => {
	const { t } = useT();
	const { state, copy } = useCopyToClipboard();

	return (
		<Stack gap={1.5} width="100%" className="rounded-2xl border border-line/70 bg-white p-3">
			<HStack width="100%" justify="between" align="center" gap={2}>
				<Text className="text-[12px] font-semibold text-slate">{t("onboarding.agent.promptTitle")}</Text>
				<Button
					label={state === "copied" ? t("onboarding.agent.copied") : t("onboarding.agent.copy")}
					variant="secondary"
					size="sm"
					onClick={() => void copy(text)}
				/>
			</HStack>
			<Text className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink">
				{text}
			</Text>
			{state === "failed" && (
				<Text className="text-[11px] text-signal">{t("onboarding.agent.copyFailed")}</Text>
			)}
		</Stack>
	);
};

const ProgressList: React.FC<{ steps: OnboardingStepView[]; isComplete: boolean }> = ({
	steps,
	isComplete,
}) => {
	const { t } = useT();
	const signature = steps.map((step) => `${step.id}:${step.status}:${step.entryCount}`).join("|");
	const initialSignature = React.useRef(signature);
	const [hasChanged, setHasChanged] = useState(false);

	React.useEffect(() => {
		if (signature !== initialSignature.current) setHasChanged(true);
	}, [signature]);

	const status = isComplete
		? t("onboarding.agent.allSet")
		: hasChanged
			? t("onboarding.agent.working")
			: t("onboarding.agent.waiting");

	return (
		<Stack gap={1.5} width="100%" className="rounded-2xl border border-line/70 bg-lifted/40 p-3">
			<HStack width="100%" justify="between" align="center" gap={2}>
				<Text className="text-[12px] font-semibold text-slate">{t("onboarding.agent.progress")}</Text>
				<Text className="text-[11px] font-medium text-slate">{status}</Text>
			</HStack>
			{steps.map((step) => {
				const done = step.status === "done" || step.status === "skipped";
				return (
					<HStack key={step.id} width="100%" gap={2} align="center">
						<Text className={`w-4 text-[12px] ${done ? "text-ink" : "text-slate/60"}`}>
							{done ? "✓" : "○"}
						</Text>
						<Text maxLines={1} className={`flex-1 text-[12px] ${done ? "text-ink" : "text-slate"}`}>
							{step.title}
						</Text>
					</HStack>
				);
			})}
		</Stack>
	);
};

/**
 * Agent onboarding: pick an agent, choose how it signs in, mint a key or copy a
 * link-flow prompt, then watch the six steps fill in while the agent works.
 */
export const OnboardingAgentSetup: React.FC<OnboardingAgentSetupProps> = ({
	steps,
	isComplete,
	mcpUrl,
	webappUrl,
	createAgentKey,
	onUseManual,
	initialAgentId,
	initialAuth,
}) => {
	const { t } = useT();
	const { lang } = useAppUI();
	const langName = lang === "th" ? "Thai" : "English";

	const firstAgent = FEATURED_AGENTS[0]!;
	const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId ?? firstAgent.id);
	const selectedAgent = useMemo(
		() => AGENT_OPTIONS.find((agent) => agent.id === selectedAgentId) ?? firstAgent,
		[selectedAgentId, firstAgent],
	);
	const [authKind, setAuthKind] = useState<AgentAuth>(
		initialAuth ?? defaultAgentAuth(selectedAgent, webappUrl),
	);
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [keyFailed, setKeyFailed] = useState(false);
	const [isMoreOpen, setIsMoreOpen] = useState(false);
	const { dismiss } = useModalBack(isMoreOpen, () => setIsMoreOpen(false));
	const sliderRef = useRef<HTMLDivElement | null>(null);

	// Keep the selected agent card visible, including when picked from More.
	useEffect(() => {
		const card = sliderRef.current?.querySelector<HTMLElement>(`#agent-card-${selectedAgentId}`);
		card?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
	}, [selectedAgentId]);

	const authOptions = availableAgentAuth(selectedAgent, webappUrl);
	const chatNeedsWebapp = selectedAgent.kind === "chat" && !webappUrl;

	const selectAgent = (agent: AgentOption) => {
		setSelectedAgentId(agent.id);
		setAuthKind(defaultAgentAuth(agent, webappUrl));
		setCreatedKey(null);
		setKeyFailed(false);
		setIsMoreOpen(false);
	};

	const handleGenerateKey = async () => {
		setIsGenerating(true);
		setKeyFailed(false);
		try {
			const key = await createAgentKey(selectedAgent.id);
			setCreatedKey(key);
		} catch {
			setKeyFailed(true);
		} finally {
			setIsGenerating(false);
		}
	};

	const promptText = useMemo(() => {
		if (authKind === "apiKey") {
			if (!createdKey) return null;
			return buildAgentPrompt({
				agent: selectedAgent,
				mcpUrl,
				lang: langName,
				auth: { kind: "apiKey", key: createdKey },
			});
		}
		if (authKind === "oauth") {
			if (!webappUrl) return null;
			return buildAgentPrompt({ agent: selectedAgent, mcpUrl, lang: langName, auth: { kind: "oauth" } });
		}
		if (!webappUrl) return null;
		return buildAgentPrompt({
			agent: selectedAgent,
			mcpUrl,
			lang: langName,
			auth: { kind: "device", webappUrl },
		});
	}, [authKind, createdKey, selectedAgent, mcpUrl, langName, webappUrl]);

	return (
		<SectionCard title={t("onboarding.agent.title")}>
			<Stack gap={3} width="100%">
				<Stack gap={2} width="100%">
					<Text className="text-[12px] font-semibold text-slate">{t("onboarding.agent.pickAgent")}</Text>
					<div
						ref={sliderRef}
						className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						<HStack gap={2} width="100%">
							{FEATURED_AGENTS.map((agent) => {
								const selected = agent.id === selectedAgent.id;
								return (
									<PlainButton
										key={agent.id}
										id={`agent-card-${agent.id}`}
										type="button"
										aria-pressed={selected}
									onClick={() => selectAgent(agent)}
										className={`w-[108px] shrink-0 cursor-pointer rounded-2xl border p-2.5 text-left ${
											selected
												? "border-signal bg-signal/10"
												: "border-line/70 bg-white active:bg-lifted/60"
										}`}
									>
										<Stack gap={1.5} width="100%">
											<AgentMonogram agent={agent} />
											<Text maxLines={1} className="text-[12px] font-semibold text-ink">
												{agent.name}
											</Text>
											<Text className="text-[10px] text-slate">
												{t(`onboarding.agent.kind.${agent.kind}`)}
											</Text>
										</Stack>
									</PlainButton>
								);
							})}
						</HStack>
					</div>
					<HStack width="100%" justify="start">
						<Button
							label={t("onboarding.agent.more")}
							variant="secondary"
							size="sm"
							onClick={() => setIsMoreOpen(true)}
						/>
					</HStack>
				</Stack>

				{authOptions.length > 1 && (
					<SegmentedControl
						value={authKind}
						onChange={(value) => setAuthKind(value as AgentAuth)}
						label={t("onboarding.agent.auth")}
						layout="fill"
					>
						{authOptions.map((auth) => (
							<SegmentedControlItem
								key={auth}
								value={auth}
								label={t(`onboarding.agent.auth.${auth}`)}
							/>
						))}
					</SegmentedControl>
				)}

				{chatNeedsWebapp && (
					<Text className="text-[12px] leading-relaxed text-slate">
						{t("onboarding.agent.signInUnavailable")}
					</Text>
				)}

				{authKind === "apiKey" && (
					<Stack gap={2} width="100%">
						{createdKey ? (
							<Stack gap={1.5} width="100%" className="rounded-2xl border border-line/70 bg-white p-3">
								<HStack width="100%" justify="between" align="center" gap={2}>
									<Text className="text-[12px] font-semibold text-slate">
										{t("onboarding.agent.keyTitle")}
									</Text>
									<CopyButton
										text={createdKey}
										label={t("onboarding.agent.copy")}
										copiedLabel={t("onboarding.agent.copied")}
									/>
								</HStack>
								<Text className="break-all font-mono text-[11px] leading-relaxed text-ink">
									{createdKey}
								</Text>
								<Text className="text-[11px] leading-relaxed text-slate">
									{t("onboarding.agent.keyOnce")}
								</Text>
							</Stack>
						) : (
							<Button
								label={
									isGenerating
										? t("onboarding.agent.generating")
										: t("onboarding.agent.generateKey")
								}
								variant="primary"
								size="sm"
								isDisabled={isGenerating}
								onClick={() => void handleGenerateKey()}
							/>
						)}

						{createdKey && (
							<Stack gap={1.5} width="100%">
								<Button
									label={
										isGenerating
											? t("onboarding.agent.generating")
											: t("onboarding.agent.regenerateKey")
									}
									variant="secondary"
									size="sm"
									isDisabled={isGenerating}
									onClick={() => void handleGenerateKey()}
								/>
								<Text className="text-[11px] leading-relaxed text-slate">
									{t("onboarding.agent.keyRegenerateNote")}
								</Text>
							</Stack>
						)}

						{keyFailed && (
							<Text className="text-[11px] text-signal">{t("onboarding.agent.keyError")}</Text>
						)}
					</Stack>
				)}

				{selectedAgent.kind === "chat" && webappUrl && (
					<Stack gap={2} width="100%" className="rounded-2xl border border-line/70 bg-white p-3">
						<Text className="text-[12px] font-semibold text-slate">
							{t("onboarding.agent.chatSteps")}
						</Text>
						{(selectedAgent.setupStepKeys ?? []).map((key, index) => (
							<HStack key={key} width="100%" gap={2} align="start">
								<Text className="w-4 shrink-0 text-[12px] font-semibold text-slate">
									{index + 1}.
								</Text>
								<Text className="flex-1 text-[12px] leading-relaxed text-ink">{t(key)}</Text>
							</HStack>
						))}
						<HStack width="100%" justify="between" align="center" gap={2}>
							<HStack gap={1} className="min-w-0 flex-1">
								<Badge variant="neutral" label={t("onboarding.agent.connectorUrl")} />
							</HStack>
							<CopyButton
								text={mcpUrl}
								label={t("onboarding.agent.copy")}
								copiedLabel={t("onboarding.agent.copied")}
							/>
						</HStack>
						<Text maxLines={1} className="break-all font-mono text-[11px] text-ink">
							{mcpUrl}
						</Text>
					</Stack>
				)}

				{authKind === "device" && (
					<Text className="text-[12px] leading-relaxed text-slate">
						{t("onboarding.agent.deviceHint")}
					</Text>
				)}

				{promptText && <PromptBox text={promptText} />}

				<ProgressList steps={steps} isComplete={isComplete} />

				<PlainButton
					type="button"
					onClick={onUseManual}
					className="cursor-pointer self-start text-[12px] font-medium text-slate underline underline-offset-2 active:text-ink"
				>
					{t("onboarding.agent.useManual")}
				</PlainButton>
			</Stack>

			{isMoreOpen && (
				<ModalPage
					title={t("onboarding.agent.moreTitle")}
					onClose={() => {
						dismiss();
						setIsMoreOpen(false);
					}}
				>
					{AGENT_KINDS.map((kind) => {
						const agents = MORE_AGENTS.filter((agent) => agent.kind === kind);
						if (agents.length === 0) return null;
						return (
							<Stack key={kind} gap={1.5} width="100%">
								<Text className="text-[12px] font-semibold text-slate">
									{t(`onboarding.agent.kind.${kind}`)}
								</Text>
								{agents.map((agent) => {
									const selected = agent.id === selectedAgent.id;
									return (
										<PlainButton
											key={agent.id}
											type="button"
											onClick={() => selectAgent(agent)}
											className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-line/70 bg-white px-3 py-2.5 text-left active:bg-lifted/60"
										>
											<HStack gap={2} align="center" className="min-w-0">
												<AgentMonogram agent={agent} />
												<Text maxLines={1} className="text-[13px] font-medium text-ink">
													{agent.name}
												</Text>
											</HStack>
											{selected && <Text className="text-[13px] text-ink">✓</Text>}
										</PlainButton>
									);
								})}
							</Stack>
						);
					})}
				</ModalPage>
			)}
		</SectionCard>
	);
};
