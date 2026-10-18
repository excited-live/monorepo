import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import { mastercardTheme } from "@excited-live/design-system";
import { Theme } from "@astryxdesign/core/theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { snapshotToBook } from "@excited-live/accounting";
import "../../src/styles.css";
import { UIProvider } from "../../src/app/ui-context";
import { accountingKeys } from "../../src/service/accounting/accounting.keys";
import { authKeys } from "../../src/service/auth/auth.queries";
import {
	FIXTURE_SNAPSHOT,
	FIXTURE_TODAY,
	FIXTURE_USER_SESSION,
} from "../../src/testing/fixtures";
import {
	LANDING_SNAPSHOT,
	LANDING_USER_SESSION,
} from "../../src/testing/landing-fixtures";

const componentModules = import.meta.glob([
	"../../src/**/*.{tsx,jsx}",
	"!../../src/**/*.spec.{tsx,jsx}",
	"!../../src/**/*.story.{tsx,jsx}",
	"!../../src/**/*.d.ts",
]);

async function resolve(componentId: string) {
	const normalized = componentId.replace(/^\/+/, "").replace(/\.[^/.]+$/, "");
	const parts = normalized.split("/");
	const targetName = parts[parts.length - 1];

	// Match file by exact relative path, or by suffix, or by component/file name
	let fileMatch: string | undefined;
	for (const path of Object.keys(componentModules)) {
		const cleanPath = path.replace(/^(\.\.\/)+src\//, "").replace(/\.[^/.]+$/, "");
		if (
			cleanPath === normalized ||
			cleanPath.endsWith("/" + normalized) ||
			cleanPath.endsWith("/" + targetName)
		) {
			fileMatch = path;
			break;
		}
	}

	if (!fileMatch) {
		throw new Error(
			`Cannot find component module for "${componentId}". Available modules:\n${Object.keys(
				componentModules,
			)
				.map((p) => p.replace(/^(\.\.\/)+src\//, ""))
				.join("\n")}`,
		);
	}

	const loader = componentModules[fileMatch];
	const mod = (await loader()) as Record<string, unknown>;

	let Component = mod[targetName] ?? mod.default;
	if (!Component) {
		for (const [, value] of Object.entries(mod)) {
			if (typeof value === "function") {
				Component = value;
				break;
			}
		}
	}

	if (!Component) {
		throw new Error(
			`Component "${targetName}" not found in ${fileMatch}. Available exports: ${Object.keys(
				mod,
			).join(", ")}`,
		);
	}

	return Component as React.ComponentType<Record<string, unknown>>;
}

let root: Root | null = null;

declare global {
	interface Window {
		/** Set via addInitScript by `*.capture.spec.tsx` to swap in marketing demo data. */
		__EXL_FIXTURES__?: "landing";
		mount: (args: { story: string; props?: Record<string, unknown> }) => Promise<void>;
		unmount: () => void;
	}
}

window.mount = async ({
	story,
	props = {},
}: {
	story: string;
	props?: Record<string, unknown>;
}) => {
	const Component = await resolve(story);
	const container = document.getElementById("root");
	if (!container) throw new Error("Mount root #root not found");

	if (!root) {
		root = createRoot(container);
	}

	const demo = window.__EXL_FIXTURES__ === "landing";
	const snapshot = demo ? LANDING_SNAPSHOT : FIXTURE_SNAPSHOT;
	const userSession = demo ? LANDING_USER_SESSION : FIXTURE_USER_SESSION;

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: Infinity,
				staleTime: Infinity,
			},
		},
	});

	// Seed the per-resource lists the service layer reads, built from the fixture snapshot.
	const book = snapshotToBook(snapshot);
	const stored = <T,>(rows: T[]) =>
		rows.map((row) => ({ ...row, version: 1, createdAt: `${FIXTURE_TODAY}T00:00:00.000Z`, updatedAt: `${FIXTURE_TODAY}T00:00:00.000Z` }));
	queryClient.setQueryData(accountingKeys.entities(), stored(book.entities));
	queryClient.setQueryData(accountingKeys.assets(), stored(book.assets));
	queryClient.setQueryData(accountingKeys.incomes(), stored(book.incomes));
	queryClient.setQueryData(accountingKeys.expenses(), stored(book.expenses));
	queryClient.setQueryData(accountingKeys.liabilities(), stored(book.liabilities));
	queryClient.setQueryData(accountingKeys.transfers(), stored(book.transfers));
	queryClient.setQueryData(authKeys.session(), {
		id: userSession.id,
		email: userSession.email,
		name: userSession.name,
		image: userSession.avatarUrl,
	});

	flushSync(() => {
		root?.render(
			<Theme theme={mastercardTheme} mode="light">
				<QueryClientProvider client={queryClient}>
					<UIProvider initialEntityId={snapshot.accounts[0]?.id} initialToday={FIXTURE_TODAY}>
						<Component {...props} />
					</UIProvider>
				</QueryClientProvider>
			</Theme>,
		);
	});
};

window.unmount = () => {
	if (root) {
		flushSync(() => {
			root?.unmount();
			root = null;
		});
	}
};
