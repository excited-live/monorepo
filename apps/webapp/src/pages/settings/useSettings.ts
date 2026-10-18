import { useCallback, useEffect, useState } from "react"
import { type DateInputProps } from "@astryxdesign/core/DateInput"
import { useLocale } from "../../lib/locale-context"
import {
	fetchSettingsData,
	saveSettingsData,
	type UserSettings,
} from "../../lib/settings-service"

export type PageLoadStatus = "loading" | "success" | "error"

export function useSettings() {
	const { t } = useLocale()
	const [status, setStatus] = useState<PageLoadStatus>("loading")
	const [error, setError] = useState<Error | null>(null)

	const [profileName, setProfileName] = useState("")
	const [birthday, setBirthday] = useState<DateInputProps["value"]>(undefined)
	const [gender, setGender] = useState("female")

	const loadSettings = useCallback(async () => {
		setStatus("loading")
		setError(null)
		try {
			const data = await fetchSettingsData()
			setProfileName(data.profileName ?? "")
			setBirthday(data.birthday)
			setGender(data.gender ?? "female")
			setStatus("success")
		} catch (err) {
			setStatus("error")
			setError(err instanceof Error ? err : new Error(String(err)))
		}
	}, [])

	useEffect(() => {
		loadSettings()
	}, [loadSettings])

	// Auto-persist settings on change
	useEffect(() => {
		if (status !== "success") return
		const timer = setTimeout(() => {
			const settings: UserSettings = {
				profileName,
				birthday,
				gender,
			}
			saveSettingsData(settings).catch((err) => {
				console.error("[settings-service] failed to save settings", err)
			})
		}, 500)
		return () => clearTimeout(timer)
	}, [profileName, birthday, gender, status])

	return {
		t,
		status,
		error,
		reload: loadSettings,
		profileName,
		setProfileName,
		birthday,
		setBirthday,
		gender,
		setGender,
	}
}

export type UseSettingsReturn = ReturnType<typeof useSettings>
