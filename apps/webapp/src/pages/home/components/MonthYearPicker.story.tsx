import { MonthYearPicker } from "./MonthYearPicker"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"

const t = (locale: "en" | "th") => getTranslator(locale).t

function MonthYearPickerStory({
	locale = "en",
	mode = "month",
	year = 2030,
	month = 5,
	allowForever = false,
}: {
	locale?: "en" | "th"
	mode?: "month" | "year"
	year?: number | null
	month?: number
	allowForever?: boolean
}) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<MonthYearPicker
				label={t(locale)("row.startYear")}
				year={year}
				month={month}
				mode={mode}
				allowForever={allowForever}
				onChange={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Month mode, a selected month-year in the future. */
export const MonthMode = () => <MonthYearPickerStory />

/** Year mode with Forever allowed (end-year picker style). */
export const YearModeWithForever = () => (
	<MonthYearPickerStory mode="year" allowForever />
)

export const ThaiLocale = () => <MonthYearPickerStory locale="th" />
