import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useBiz } from "../state";
import { HomeView } from "../views/HomeView";
import { CapitalView } from "../views/CapitalView";
import { SettingsView } from "../views/SettingsView";
import { SignInView } from "../views/SignInView";

export const Route = createFileRoute("/")({
	component: IndexComponent,
});

function IndexComponent() {
	const { activeTab, userSession } = useBiz();

	if (!userSession.isAuthenticated) {
		return <SignInView />;
	}

	const renderContent = () => {
		switch (activeTab) {
			case "home":
				return <HomeView />;
			case "capital":
				return <CapitalView />;
			case "settings":
				return <SettingsView />;
			default:
				return <HomeView />;
		}
	};

	return (
		<div key={activeTab} className="tab-view-container">
			{renderContent()}
		</div>
	);
}
