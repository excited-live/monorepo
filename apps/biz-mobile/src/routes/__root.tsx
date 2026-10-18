import React from "react";
import { mastercardTheme } from "@excited-live/design-system";
import { Stack } from "@astryxdesign/core/Stack";
import { Theme } from "@astryxdesign/core/theme";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { BottomDock } from "../components/BottomDock";
import { UIProvider } from "../app/ui-context";
import { useUserData } from "../state";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function AppShell() {
	const { userSession } = useUserData();

	return (
		<Theme theme={mastercardTheme} mode="light">
			<Stack
				className={`relative mx-auto min-h-dvh w-full max-w-[480px] overflow-visible pt-0 pr-[max(16px,env(safe-area-inset-right))] pb-[var(--dock-clearance)] pl-[max(16px,env(safe-area-inset-left))] ${
					userSession.isAuthenticated
						? ""
						: "justify-between !pt-[max(20px,env(safe-area-inset-top))] !pb-[max(20px,env(safe-area-inset-bottom))]"
				}`}
			>
				{userSession.isAuthenticated && <Header />}
				<Stack as="main" width="100%" className="min-w-0 flex-1">
					<Outlet />
				</Stack>
				{userSession.isAuthenticated && <BottomDock />}
			</Stack>
		</Theme>
	);
}

function RootComponent() {
	return (
		<UIProvider>
			<AppShell />
		</UIProvider>
	);
}
