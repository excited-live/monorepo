import React from "react";

export interface HomeAppSectionProps {
	children?: React.ReactNode;
}

export const HomeAppSection: React.FC<HomeAppSectionProps> = ({
	children = (
		<div style={{ padding: "20px 0", textAlign: "center", color: "var(--slate-gray)" }}>
			Sheet Content
		</div>
	),
}) => {
	return (
		<div className="home-app-section">
			<div className="home-sheet-handle" />
			{children}
		</div>
	);
};
