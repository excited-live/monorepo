import React from "react";
import { PlainButton } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";
import { useT } from "../../../../application/hooks/useT";
import type { OnboardingMethod } from "../../../../service/onboarding/onboarding.api";

export interface OnboardingMethodChooserProps {
	onSelect: (method: OnboardingMethod) => void;
}

/** First-run choice between setting up with an AI agent and the manual stepper. */
export const OnboardingMethodChooser: React.FC<OnboardingMethodChooserProps> = ({ onSelect }) => {
	const { t } = useT();

	return (
		<SectionCard title={t("onboarding.method.title")}>
			<Stack gap={3} width="100%">
				<PlainButton
					type="button"
					data-testid="onboarding-method-agent"
					onClick={() => onSelect("agent")}
					className="w-full cursor-pointer rounded-3xl border border-signal/40 bg-signal/[0.06] p-4 text-left active:bg-signal/10"
				>
					<Stack gap={1} width="100%">
						<HStack width="100%" justify="between" align="center" gap={2}>
							<Text className="text-[15px] font-semibold text-ink">{t("onboarding.method.agent")}</Text>
							<Badge variant="orange" label={t("onboarding.method.recommended")} />
						</HStack>
						<Text className="text-[12px] leading-relaxed text-slate">
							{t("onboarding.method.agentHint")}
						</Text>
					</Stack>
				</PlainButton>

				<PlainButton
					type="button"
					data-testid="onboarding-method-manual"
					onClick={() => onSelect("manual")}
					className="w-full cursor-pointer rounded-3xl border border-line/70 bg-white p-4 text-left active:bg-lifted/60"
				>
					<Stack gap={1} width="100%">
						<Text className="text-[15px] font-semibold text-ink">{t("onboarding.method.manual")}</Text>
						<Text className="text-[12px] leading-relaxed text-slate">
							{t("onboarding.method.manualHint")}
						</Text>
					</Stack>
				</PlainButton>
			</Stack>
		</SectionCard>
	);
};
