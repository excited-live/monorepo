import { ValueDialog, type ValueDialogDescriptor } from "./ValueDialog"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function ValueDialogStory({
	dialog,
	locale = "en",
}: {
	dialog: ValueDialogDescriptor
	locale?: "en" | "th"
}) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<ValueDialog
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

/** Add flow into assets: type unlocked, label pre-filled from the type. */
export const AddAsset = () => (
	<ValueDialogStory dialog={{ mode: "add", kind: "assets", lockType: false }} />
)

/** Edit flow: home loan row loaded, remove button visible. */
export const EditLiability = () => (
	<ValueDialogStory
		dialog={{ mode: "edit", kind: "liabilities", rowId: "liab-home" }}
	/>
)

export const ThaiLocale = () => (
	<ValueDialogStory dialog={{ mode: "add", kind: "assets", lockType: false }} locale="th" />
)
