import { DateInput } from "@astryxdesign/core/DateInput"
import { Grid } from "@astryxdesign/core/Grid"
import { Heading } from "@astryxdesign/core/Heading"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import { GenderField } from "./components/GenderField"
import { isLiveApi } from "../../lib/api-client"
import { useSettings } from "./useSettings"
import { PageEmptyState } from "../../components/PageEmptyState"

export function Settings() {
	const {
		t,
		status,
		reload,
		profileName,
		setProfileName,
		birthday,
		setBirthday,
		gender,
		setGender,
	} = useSettings()

	if (status === "loading") {
		return (
			<Stack className="chart-panel__inner settings-panel" vAlign="center" hAlign="center" padding={4}>
				<Text color="secondary">{t("plan.lastSyncedToday")}</Text>
			</Stack>
		)
	}

	if (status === "error") {
		return (
			<PageEmptyState
				title={t("empty.settings.title")}
				description={t("empty.settings.description")}
				actionLabel={t("action.reload")}
				onAction={reload}
			/>
		)
	}

	return (
		<Stack gap={3} className="chart-panel__inner settings-panel">
			<Stack gap={1}>
				<Heading level={2}>{t("nav.settings")}</Heading>
				{isLiveApi() ? null : <Text color="secondary">{t("settings.note")}</Text>}
			</Stack>
			<Grid columns={{ minWidth: 220, max: 2 }} gap={2}>
				<TextInput
					label={t("settings.name")}
					value={profileName}
					onChange={setProfileName}
				/>
				<DateInput
					label={t("settings.birthday")}
					value={birthday}
					onChange={setBirthday}
				/>
				<GenderField
					value={gender}
					onChange={setGender}
					t={t}
				/>
			</Grid>
		</Stack>
	)
}

export default Settings
