import { TypePickerDialog } from "./TypePickerDialog"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { INCOME_TYPE_IDS } from "../../../lib/plan-service"

const t = (locale: "en" | "th") => getTranslator(locale).t

function TypePickerDialogStory({
	locale = "en",
	addedTypeIds = [],
}: {
	locale?: "en" | "th"
	addedTypeIds?: string[]
}) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<TypePickerDialog
				kind="incomes"
				addedTypeIds={addedTypeIds}
				onPick={() => {}}
				onClose={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Fresh plan: no income types added yet, full catalog offered. */
export const AddIncomeType = () => <TypePickerDialogStory />

/** Salary already added: offered list shrinks. */
export const SalaryAlreadyAdded = () => (
	<TypePickerDialogStory addedTypeIds={["salary"]} />
)

/** Every income type added: empty-state message. */
export const AllTypesAdded = () => (
	<TypePickerDialogStory addedTypeIds={[...INCOME_TYPE_IDS]} />
)

export const ThaiLocale = () => <TypePickerDialogStory locale="th" />
