import React from "react";

export const HomeHeroBackground: React.FC = () => {
	return (
		<div className="home-hero-bg-wrapper">
			<img
				src="/hero-banner.webp"
				alt="Solopreneur Business Treasury"
				className="home-hero-bg-image"
			/>
			<div className="home-hero-bg-scrim" />
		</div>
	);
};
