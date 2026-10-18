import React from "react";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { SectionCard } from "../../../../components/SectionCard";

export interface HomeCareerOnboardingProps {
	onAddCareer?: () => void;
}

export const HomeCareerOnboarding: React.FC<HomeCareerOnboardingProps> = ({ onAddCareer = () => {} }) => (
	<SectionCard title="Add Career Income">
		<Text className="text-[13px] text-slate">
			Track your salary as personal income so your run rate and runway projection are accurate.
		</Text>
		<Button label="Add Career" variant="primary" className="self-start" onClick={onAddCareer} />
	</SectionCard>
);
