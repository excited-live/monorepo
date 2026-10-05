import { GroupedPeriodTable } from "./GroupedPeriodTable"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function GroupedPeriodTableStory({
	kind,
	locale = "en",
}: {
	kind: "incomes" | "expenses"
	locale?: "en" | "th"
}) {
	const plan = fixturePlan()
	return (
		<TestScaffold locale={locale} initialPath="/">
			<GroupedPeriodTable
				kind={kind}
				plan={plan}
				addedTypeIds={Array.from(new Set(plan[kind].map((r) => r.typeId)))}
				onAddNewItem={() => {}}
				onAddItem={() => {}}
				onEditItem={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Income groups collapsed: Salary and Freelance gigs rows + add marker. */
export const IncomeGroups = () => <GroupedPeriodTableStory kind="incomes" />

/** Expense groups with a mortgage row carrying the deductible flag. */
export const ExpenseGroups = () => <GroupedPeriodTableStory kind="expenses" />

export const ThaiLocale = () => <GroupedPeriodTableStory kind="incomes" locale="th" />
