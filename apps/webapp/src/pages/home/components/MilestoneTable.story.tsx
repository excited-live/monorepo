import { MilestoneTable } from "./MilestoneTable"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function MilestoneTableStory({ locale = "en" }: { locale?: "en" | "th" }) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<MilestoneTable
				plan={fixturePlan()}
				onAdd={() => {}}
				onEdit={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Filled milestone table: Buy house + Retire rows and the add marker. */
export const Default = () => <MilestoneTableStory />

export const ThaiLocale = () => <MilestoneTableStory locale="th" />
