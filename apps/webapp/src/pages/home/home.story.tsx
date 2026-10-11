import { Home } from "./home"
import { TestScaffold } from "../../testing/TestScaffold"

export const Default = () => (
	<TestScaffold locale="en" initialPath="/" withPlanDashboard>
		<Home />
	</TestScaffold>
)

export const ThaiLocale = () => (
	<TestScaffold locale="th" initialPath="/" withPlanDashboard>
		<Home />
	</TestScaffold>
)
