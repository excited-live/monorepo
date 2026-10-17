export interface IStorageAdapter {
	getItem<T>(key: string, defaultValue: T): T;
	setItem<T>(key: string, value: T): void;
	removeItem(key: string): void;
	clear(): void;
}
