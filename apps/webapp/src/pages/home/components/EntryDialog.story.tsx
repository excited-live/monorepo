import { EntryDialog, type EntryDialogDescriptor } from "./EntryDialog"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function EntryDialogStory({
	dialog,
	locale = "en",
}: {
	dialog: EntryDialogDescriptor
	locale?: "en" | "th"
}) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<EntryDialog
				dialog={dialog}
				plan={fixturePlan()}
				onSave={() => {}}
				onRemove={() => {}}
				onClose={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Add income — type picker unlocked, empty amount. */
export const AddIncome = () => (
	<EntryDialogStory dialog={{ mode: "add", kind: "incomes", lockType: false }} />
)

/** Edit the fixture salary row — form pre-filled, locked type, remove button. */
export const EditSalary = () => (
	<EntryDialogStory
		dialog={{ mode: "edit", kind: "incomes", rowId: "income-salary" }}
	/>
)

/** Edit an expense row — exposes the deductible segmented control. */
export const EditExpenseDeductible = () => (
	<EntryDialogStory
		dialog={{ mode: "edit", kind: "expenses", rowId: "expense-mortgage" }}
	/>
)

/** Thai locale add-expense dialog. */
export const ThaiLocale = () => (
	<EntryDialogStory
		dialog={{ mode: "add", kind: "expenses", lockType: false }}
		locale="th"
	/>
)
