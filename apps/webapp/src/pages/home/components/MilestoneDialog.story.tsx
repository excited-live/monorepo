import { MilestoneDialog } from "./MilestoneDialog"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function MilestoneDialogStory({
	id,
	locale = "en",
}: {
	id: string | null
	locale?: "en" | "th"
}) {
	return (
		<TestScaffold locale={locale} initialPath="/">
			<MilestoneDialog
				id={id}
				plan={fixturePlan()}
				onSave={() => {}}
				onRemove={() => {}}
				onClose={() => {}}
				t={t(locale)}
			/>
		</TestScaffold>
	)
}

/** Add flow: empty label, year pre-filled to plan.startYear + 29. */
export const AddMilestone = () => <MilestoneDialogStory id={null} />

/** Edit flow: existing "Buy house" milestone, remove button visible. */
export const EditMilestone = () => <MilestoneDialogStory id="milestone-house" />

export const ThaiLocale = () => <MilestoneDialogStory id={null} locale="th" />
