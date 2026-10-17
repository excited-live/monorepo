import React from "react";

export interface HomeCareerOnboardingProps {
	onAddCareer?: () => void;
}

export const HomeCareerOnboarding: React.FC<HomeCareerOnboardingProps> = ({
	onAddCareer = () => {},
}) => {
	return (
		<div className="card">
			<div className="section-title">Add Career Income</div>
			<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
				Track your salary as personal income so your run rate and runway projection are accurate.
			</div>
			<button
				type="button"
				className="action-pill-btn primary"
				style={{ alignSelf: "flex-start" }}
				onClick={onAddCareer}
			>
				Add Career
			</button>
		</div>
	);
};
