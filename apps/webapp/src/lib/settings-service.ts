import { type DateInputProps } from "@astryxdesign/core/DateInput"
import { apiFetch, isLiveApi } from "./api-client"

export interface UserSettings {
	profileName: string
	birthday: DateInputProps["value"]
	gender: string
}

const DEFAULT_SETTINGS: UserSettings = {
	profileName: "",
	birthday: undefined,
	gender: "female",
}

const MOCK_STORAGE_KEY = "excited_live_user_settings"

function getMockSettings(): UserSettings {
	if (typeof window === "undefined") return DEFAULT_SETTINGS
	try {
		const raw = localStorage.getItem(MOCK_STORAGE_KEY)
		if (!raw) return DEFAULT_SETTINGS
		return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
	} catch {
		return DEFAULT_SETTINGS
	}
}

function saveMockSettings(settings: UserSettings): void {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(settings))
	} catch {
		// Ignore storage quota errors in mock mode
	}
}

/**
 * Loads user settings.
 * In mock mode: reads from localStorage/defaults.
 * In live mode: fetches from backend /api/v1/settings.
 */
export async function fetchSettingsData(): Promise<UserSettings> {
	if (!isLiveApi()) {
		return getMockSettings()
	}

	return await apiFetch<UserSettings>("/settings")
}

/**
 * Persists user settings.
 * In mock mode: saves to localStorage.
 * In live mode: PUTs to backend /api/v1/settings.
 */
export async function saveSettingsData(settings: UserSettings): Promise<void> {
	if (!isLiveApi()) {
		saveMockSettings(settings)
		return
	}

	await apiFetch<void>("/settings", {
		method: "PUT",
		body: JSON.stringify(settings),
	})
}
