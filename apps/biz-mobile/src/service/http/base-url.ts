declare const __TAURI_DEV_HOST__: string | undefined;

/**
 * Resolves the backend API root URL based on environment:
 * - VITE_API_URL if configured (normalized without trailing /api/v1 or slashes)
 * - TAURI_DEV_HOST on local emulators or physical devices via __TAURI_DEV_HOST__
 * - Localhost dev server fallback
 */
export function getApiBaseUrl(): string {
	const configured = import.meta.env.VITE_API_URL as string | undefined;
	if (configured) {
		return configured.replace(/\/+$/, "").replace(/\/api(\/v1)?$/, "");
	}
	const devHost =
		(typeof __TAURI_DEV_HOST__ !== "undefined" && __TAURI_DEV_HOST__) ||
		(import.meta.env.TAURI_DEV_HOST as string | undefined);
	if (devHost) {
		return `http://${devHost}:8000`;
	}
	if (typeof window !== "undefined" && window.location) {
		const host = window.location.hostname;
		if (host === "localhost" || host === "127.0.0.1") {
			return "http://localhost:8000";
		}
	}
	return "";
}
