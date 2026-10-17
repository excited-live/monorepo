import type { IStorageAdapter } from "./storage.interface";

export class LocalStorageAdapter implements IStorageAdapter {
	getItem<T>(key: string, defaultValue: T): T {
		if (typeof window === "undefined" || !window.localStorage) {
			return defaultValue;
		}
		try {
			const item = window.localStorage.getItem(key);
			if (item === null) return defaultValue;
			return JSON.parse(item) as T;
		} catch {
			return defaultValue;
		}
	}

	setItem<T>(key: string, value: T): void {
		if (typeof window === "undefined" || !window.localStorage) {
			return;
		}
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Ignore quota exceeded or storage disabled
		}
	}

	removeItem(key: string): void {
		if (typeof window === "undefined" || !window.localStorage) {
			return;
		}
		try {
			window.localStorage.removeItem(key);
		} catch {
			// Ignore storage disabled
		}
	}

	clear(): void {
		if (typeof window === "undefined" || !window.localStorage) {
			return;
		}
		try {
			window.localStorage.clear();
		} catch {
			// Ignore storage disabled
		}
	}
}

export const defaultStorage = new LocalStorageAdapter();
