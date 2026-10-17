import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAppUI, useUserData } from "../state";
import { Home } from "../pages/home/Home";
import { Management } from "../pages/management/Management";
import { Settings } from "../pages/settings/Settings";
import { Signin } from "../pages/signin/Signin";

export const Route = createFileRoute("/")({
	component: IndexComponent,
});

function IndexComponent() {
	const { activeTab, setActiveTab, setActiveEntityId } = useAppUI();
	const { userSession } = useUserData();

	if (!userSession.isAuthenticated) {
		return <Signin />;
	}

	const renderContent = () => {
		switch (activeTab) {
			case "home":
				return (
					<Home
						onSelectAccount={(accId) => {
							setActiveEntityId(accId);
							setActiveTab("capital");
						}}
					/>
				);
			case "capital":
				return <Management />;
			case "settings":
				return <Settings />;
			default:
				return <Home />;
		}
	};

	return (
		<div key={activeTab} className="tab-view-container">
			{renderContent()}
		</div>
	);
}
