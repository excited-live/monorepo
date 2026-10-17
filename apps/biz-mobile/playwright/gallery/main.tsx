import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import React from "react";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@excited-live/design-system/mastercard-theme.css";
import { Theme, mastercardTheme } from "@excited-live/design-system";
import "../../src/styles.css";
import { BizProvider } from "../../src/application/context/BizContext";
import type { IStorageAdapter } from "../../src/application/storage/storage.interface";
import {
	FIXTURE_ACCOUNTS,
	FIXTURE_HARDWARE,
	FIXTURE_LIABILITIES,
	FIXTURE_REVENUES,
	FIXTURE_SUBSCRIPTIONS,
	FIXTURE_TRANSFERS,
	FIXTURE_USER_SESSION,
} from "../../src/testing/fixtures";

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
	clear(): void {
		this.store.clear();
	}
}

const storage = new MemoryStorageAdapter();

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

	// Always wrap component in BizProvider & Theme for full standalone testing capability
	flushSync(() => {
		root?.render(
			<Theme theme={mastercardTheme} mode="light">
				<BizProvider
					storage={storage}
					initialAccounts={FIXTURE_ACCOUNTS}
					initialHardware={FIXTURE_HARDWARE}
					initialSubscriptions={FIXTURE_SUBSCRIPTIONS}
					initialRevenues={FIXTURE_REVENUES}
					initialLiabilities={FIXTURE_LIABILITIES}
					initialTransfers={FIXTURE_TRANSFERS}
					initialUserSession={FIXTURE_USER_SESSION}
				>
					<Component {...props} />
				</BizProvider>
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
