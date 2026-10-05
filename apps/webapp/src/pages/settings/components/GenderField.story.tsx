import { GenderField } from "./GenderField"
import { TestScaffold } from "../../../testing/TestScaffold"
import { getTranslator } from "../../../lib/dictionaries"

const t = (locale: "en" | "th") => getTranslator(locale).t

export const Default = () => {
	const tr = t("en")
	return (
		<TestScaffold locale="en" initialPath="/">
			<GenderField
				value="female"
				onChange={() => {}}
				t={tr}
			/>
		</TestScaffold>
	)
}

export const MaleSelected = () => {
	const tr = t("en")
	return (
		<TestScaffold locale="en" initialPath="/">
			<GenderField
				value="male"
				onChange={() => {}}
				t={tr}
			/>
		</TestScaffold>
	)
}

export const ThaiLocale = () => {
	const tr = t("th")
	return (
		<TestScaffold locale="th" initialPath="/">
			<GenderField
				value="other"
				onChange={() => {}}
				t={tr}
			/>
		</TestScaffold>
	)
}
