import React from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import "@excited-live/design-system/mastercard-theme.css";
import { Header } from "../components/Header";
import { BottomDock } from "../components/BottomDock";
import { BizProvider, useUserData } from "../state";
import "../styles.css";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function AppShell() {
	const { userSession } = useUserData();

	return (
		<div
			className={`mobile-shell ${!userSession.isAuthenticated ? "auth-gate-shell" : ""}`}
			data-astryx-theme="mastercard"
		>
			{userSession.isAuthenticated && <Header />}
			<main className="mobile-main">
				<Outlet />
			</main>
			{userSession.isAuthenticated && <BottomDock />}
		</div>
	);
}

function RootComponent() {
	return (
		<BizProvider>
			<AppShell />
		</BizProvider>
	);
}
