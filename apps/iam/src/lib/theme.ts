import { useCallback, useEffect, useState } from "react"

export type ThemeMode = "light" | "dark"

const STORAGE_KEY = "excited_iam_theme"

function initialMode(): ThemeMode {
	if (typeof window === "undefined") return "light"
	const stored = window.localStorage.getItem(STORAGE_KEY)
	if (stored === "light" || stored === "dark") return stored
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Light/dark mode for the whole document.
 *
 * Sets `data-theme` (Astryx `color-scheme` + our CSS) and `data-astryx-theme`
 * so the Mastercard theme tokens from the design system apply to portals too.
 */
export function useThemeMode(): { mode: ThemeMode; toggle: () => void } {
	const [mode, setMode] = useState<ThemeMode>(initialMode)

	useEffect(() => {
		const root = document.documentElement
		root.dataset.theme = mode
		root.dataset.astryxTheme = "mastercard"
		root.style.colorScheme = mode
		try {
			window.localStorage.setItem(STORAGE_KEY, mode)
		} catch {
			// Storage is optional; the choice lives for this tab.
		}
	}, [mode])

	const toggle = useCallback(() => {
		setMode((current) => (current === "light" ? "dark" : "light"))
	}, [])

	return { mode, toggle }
}
