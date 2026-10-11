import { Topbar } from "./Topbar"
import { TestScaffold } from "../testing/TestScaffold"

export const Default = () => (
	<TestScaffold locale="en" initialPath="/">
		<Topbar
			auth={{ configured: false, user: null }}
			returnPathname="/"
		/>
	</TestScaffold>
)

export const Authenticated = () => (
	<TestScaffold locale="en" initialPath="/">
		<Topbar
			auth={{
				configured: true,
				user: { firstName: "Alex", email: "alex@excited.live" },
			}}
			returnPathname="/"
		/>
	</TestScaffold>
)

export const SettingsActive = () => (
	<TestScaffold locale="en" initialPath="/settings">
		<Topbar
			auth={{ configured: false, user: null }}
			returnPathname="/settings"
		/>
	</TestScaffold>
)

export const ThaiLocale = () => (
	<TestScaffold locale="th" initialPath="/">
		<Topbar
			auth={{ configured: false, user: null }}
			returnPathname="/"
		/>
	</TestScaffold>
)
