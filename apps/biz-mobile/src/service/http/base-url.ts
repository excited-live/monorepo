declare const __TAURI_DEV_HOST__: string | undefined;

/**
 * Resolves the backend API root URL based on environment:
 * - VITE_API_URL if configured
 * - Tauri dev host on local emulators
 * - LAN IP on Tauri Android WebView
 * - Localhost dev server fallback
 */
export function getApiBaseUrl(): string {
	if (import.meta.env.VITE_API_URL) {
		return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
	}
	if (typeof __TAURI_DEV_HOST__ !== "undefined" && __TAURI_DEV_HOST__) {
		return `http://${__TAURI_DEV_HOST__}:8000`;
	}
	if (typeof window !== "undefined" && window.location) {
		const host = window.location.hostname;
		// Inside Tauri Android WebView, the origin is http://tauri.localhost.
		// In Android's Chromium WebViewClient, `shouldInterceptRequest` intercepts tauri.localhost
		// and strips POST request bodies entirely. We must connect directly to the dev machine LAN IP:
		if (host === "tauri.localhost") {
			return "http://192.168.1.130:8000";
		}
		if (host === "localhost" || host === "127.0.0.1") {
			return "http://localhost:8000";
		}
	}
	return "";
}
