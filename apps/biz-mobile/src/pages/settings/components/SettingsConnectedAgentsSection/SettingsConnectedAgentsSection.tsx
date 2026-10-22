import React, { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";
import { useT } from "../../../../application/hooks/useT";
import { useAppUI } from "../../../../application/hooks/useAppUI";
import { getAgentName } from "../../../../domain/agents";
import type { MobileLocale } from "../../../../domain/types";

export interface ConnectedAgentKeyView {
	id: string;
	name?: string | null;
	agentId: string | null;
	createdAt?: string | null;
	expiresAt?: string | null;
	lastRequest?: string | null;
}

export interface SettingsConnectedAgentsSectionProps {
	keys?: ConnectedAgentKeyView[];
	isLoading?: boolean;
	isError?: boolean;
	onRevoke?: (id: string) => void;
}

const formatDate = (iso: string, lang: MobileLocale): string => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

/** Revocable API keys agents use to read and write the user's books. */
export const SettingsConnectedAgentsSection: React.FC<SettingsConnectedAgentsSectionProps> = ({
	keys = [],
	isLoading = false,
	isError = false,
	onRevoke = () => {},
}) => {
	const { t } = useT();
	const { lang } = useAppUI();
	const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);

	const closeRevoke = () => setPendingRevoke(null);

	return (
		<SectionCard
			title={t("settings.connectedAgents")}
			badge={<Badge variant="neutral" label={String(keys.length)} />}
		>
			<Stack gap={2} width="100%">
				{isLoading && <Text className="text-[12px] text-slate">{t("settings.agentKeys.loading")}</Text>}

				{!isLoading && isError && (
					<Text className="text-[12px] text-signal">{t("settings.agentKeys.error")}</Text>
				)}

				{!isLoading && !isError && keys.length === 0 && (
					<Text className="text-[12px] leading-relaxed text-slate">{t("settings.agentKeys.empty")}</Text>
				)}

				{!isLoading &&
					!isError &&
					keys.map((key) => {
						const agentName = key.agentId ? getAgentName(key.agentId) : null;
						const displayName =
							key.name?.trim() || agentName || t("settings.agentKeys.unknownAgent");
						return (
							<Stack
								key={key.id}
								gap={1.5}
								width="100%"
								className="rounded-2xl border border-line/70 bg-white p-3"
							>
								<HStack width="100%" justify="between" align="center" gap={2}>
									<Stack gap={0.5} className="min-w-0 flex-1">
										<Text maxLines={1} className="text-[13px] font-semibold text-ink">
											{displayName}
										</Text>
										{agentName && displayName !== agentName && (
											<Text className="text-[11px] text-slate">{agentName}</Text>
										)}
									</Stack>
									<Button
										label={t("settings.agentKeys.revoke")}
										variant="secondary"
										size="sm"
										onClick={() => setPendingRevoke(key.id)}
									/>
								</HStack>

								<HStack gap={2} className="flex-wrap">
									{key.createdAt && (
										<Text className="text-[11px] text-slate">
											{t("settings.agentKeys.created", { date: formatDate(key.createdAt, lang) })}
										</Text>
									)}
									<Text className="text-[11px] text-slate">
										{key.lastRequest
											? t("settings.agentKeys.lastUsed", { date: formatDate(key.lastRequest, lang) })
											: t("settings.agentKeys.neverUsed")}
									</Text>
									{key.expiresAt && (
										<Text className="text-[11px] text-slate">
											{t("settings.agentKeys.expires", { date: formatDate(key.expiresAt, lang) })}
										</Text>
									)}
								</HStack>
							</Stack>
						);
					})}
			</Stack>

			<Dialog isOpen={pendingRevoke !== null} onOpenChange={(open) => !open && closeRevoke()} width={360}>
				<Stack gap={4} width="100%">
					<DialogHeader
						title={t("settings.agentKeys.revokeTitle")}
						onOpenChange={(open) => !open && closeRevoke()}
					/>
					<Text className="text-[13px] leading-relaxed text-slate">
						{t("settings.agentKeys.revokeBody")}
					</Text>
					<HStack gap={2} justify="end">
						<Button label={t("common.cancel")} variant="secondary" size="sm" onClick={closeRevoke} />
						<Button
							label={t("settings.agentKeys.revokeConfirm")}
							variant="primary"
							size="sm"
							onClick={() => {
								if (pendingRevoke) onRevoke(pendingRevoke);
								closeRevoke();
							}}
						/>
					</HStack>
				</Stack>
			</Dialog>
		</SectionCard>
	);
};
