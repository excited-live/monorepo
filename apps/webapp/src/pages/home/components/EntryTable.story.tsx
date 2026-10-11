import { EntryTable } from "./EntryTable"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function EntryTableStory({ locale = "en" }: { locale?: "en" | "th" }) {
	const plan = fixturePlan()
	return (
		<TestScaffold locale={locale} initialPath="/">
			<EntryTable
				rows={plan.incomes}
				plan={plan}
				onEditItem={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Filled income table with period, rate and lifetime columns. */
export const Default = () => <EntryTableStory />

export const ThaiLocale = () => <EntryTableStory locale="th" />
