import { AssistantRail } from "./AssistantRail"
import { TestScaffold } from "../testing/TestScaffold"
import { computePlanSummary, defaultPlan } from "../lib/plan-service"
import { getTranslator } from "../lib/dictionaries"

const summary = computePlanSummary(defaultPlan())

export const Empty = () => {
	const { t } = getTranslator("en")
	return (
		<TestScaffold locale="en" initialPath="/">
			<AssistantRail summary={summary} t={t} />
		</TestScaffold>
	)
}

export const ThaiLocale = () => {
	const { t } = getTranslator("th")
	return (
		<TestScaffold locale="th" initialPath="/">
			<AssistantRail summary={summary} t={t} />
		</TestScaffold>
	)
}
