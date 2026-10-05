import { GroupedValueTable } from "./GroupedValueTable"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"
import { fixturePlan } from "../../../testing/fixtures"

const t = (locale: "en" | "th") => getTranslator(locale).t

function GroupedValueTableStory({
	kind,
	locale = "en",
}: {
	kind: "assets" | "liabilities"
	locale?: "en" | "th"
}) {
	const plan = fixturePlan()
	return (
		<TestScaffold locale={locale} initialPath="/">
			<GroupedValueTable
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

/** Asset groups: SET index fund + Car rows with totals. */
export const AssetGroups = () => <GroupedValueTableStory kind="assets" />

/** Liability groups: home loan + credit card rows. */
export const LiabilityGroups = () => (
	<GroupedValueTableStory kind="liabilities" />
)

export const ThaiLocale = () => <GroupedValueTableStory kind="assets" locale="th" />
