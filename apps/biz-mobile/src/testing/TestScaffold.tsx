import React, { useMemo, type ReactNode } from "react";
import { Theme, mastercardTheme } from "@excited-live/design-system";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { BizProvider } from "../application/context/BizContext";
import type { IStorageAdapter } from "../application/storage/storage.interface";
import type { UserSession } from "../domain/types";
import {
	FIXTURE_ACCOUNTS,
	FIXTURE_HARDWARE,
	FIXTURE_LIABILITIES,
	FIXTURE_REVENUES,
	FIXTURE_SUBSCRIPTIONS,
	FIXTURE_TRANSFERS,
	FIXTURE_USER_SESSION,
} from "./fixtures";

class MemoryStorageAdapter implements IStorageAdapter {
	private store = new Map<string, string>();
	getItem<T>(key: string, defaultValue: T): T {
		const val = this.store.get(key);
		if (!val) return defaultValue;
		try {
			return JSON.parse(val) as T;
		} catch {
			return defaultValue;
		}
	}
	setItem<T>(key: string, value: T): void {
		this.store.set(key, JSON.stringify(value));
	}
	removeItem(key: string): void {
		this.store.delete(key);
	}
}

export interface TestScaffoldProps {
	children: ReactNode;
	initialPath?: string;
	session?: UserSession;
	customStorage?: IStorageAdapter;
}

export const TestScaffold: React.FC<TestScaffoldProps> = ({
	children,
	initialPath = "/",
	session = FIXTURE_USER_SESSION,
	customStorage,
}) => {
	const storage = useMemo(() => customStorage || new MemoryStorageAdapter(), [customStorage]);

	const router = useMemo(() => {
		const rootRoute = createRootRoute({
			component: () => <>{children}</>,
		});
		const memoryHistory = createMemoryHistory({
			initialEntries: [initialPath],
		});
		return createRouter({
			routeTree: rootRoute,
			history: memoryHistory,
		});
	}, [children, initialPath]);

	return (
		<Theme theme={mastercardTheme} mode="light">
			<BizProvider
				storage={storage}
				initialSession={session}
				initialAccounts={FIXTURE_ACCOUNTS}
				initialSubscriptions={FIXTURE_SUBSCRIPTIONS}
				initialHardware={FIXTURE_HARDWARE}
				initialRevenues={FIXTURE_REVENUES}
				initialLiabilities={FIXTURE_LIABILITIES}
				initialTransfers={FIXTURE_TRANSFERS}
			>
				<div
					style={{
						maxWidth: 430,
						margin: "0 auto",
						minHeight: "100vh",
						background: "#F3F0EE",
						position: "relative",
						overflow: "hidden",
					}}
				>
					<RouterProvider router={router} />
				</div>
			</BizProvider>
		</Theme>
	);
};
