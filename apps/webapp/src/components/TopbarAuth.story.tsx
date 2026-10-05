import { TopbarAuth } from "./TopbarAuth"
import { TestScaffold } from "../testing/TestScaffold"

export const SignedOut = () => (
	<TestScaffold locale="en" initialPath="/">
		<TopbarAuth
			auth={{ configured: true, user: null }}
			returnPathname="/"
		/>
	</TestScaffold>
)

export const SignedIn = () => (
	<TestScaffold locale="en" initialPath="/">
		<TopbarAuth
			auth={{
				configured: true,
				user: { firstName: "Alex", email: "alex@excited.live" },
			}}
			returnPathname="/"
		/>
	</TestScaffold>
)

export const ThaiLocale = () => (
	<TestScaffold locale="th" initialPath="/">
		<TopbarAuth
			auth={{ configured: true, user: null }}
			returnPathname="/"
		/>
	</TestScaffold>
)
