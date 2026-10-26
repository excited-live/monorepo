import { Text } from "@astryxdesign/core/Text"

/**
 * The sign-in page's error line. `role="alert"` makes every failed attempt
 * announce itself, including a request the 6 s deadline aborted: the copy
 * there tells the user to check the connection and try again, and the submit
 * button is enabled again at the same moment.
 */
export function AuthErrorNotice({ message }: { message: string | null }) {
	if (!message) return null
	return (
		<Text size="sm" className="signin-error" role="alert">
			{message}
		</Text>
	)
}
