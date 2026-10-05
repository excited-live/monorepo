import { Settings } from "./settings"
import { TestScaffold } from "../../testing/TestScaffold"

export const Default = () => (
	<TestScaffold locale="en" initialPath="/" withPlanDashboard>
		<Settings />
	</TestScaffold>
)

export const ThaiLocale = () => (
	<TestScaffold locale="th" initialPath="/" withPlanDashboard>
		<Settings />
	</TestScaffold>
)
