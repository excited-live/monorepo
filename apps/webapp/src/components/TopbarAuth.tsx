import { Link, Text } from "@excited-live/design-system"
import { createAuthClient } from "@excited-live/auth/client"
import { useNavigate } from "@tanstack/react-router"
import { useLocale } from "../lib/locale-context"

export interface TopbarAuthProps {
	auth: { configured: boolean; user: { firstName: string | null; email: string } | null }
	returnPathname: string
}

const authClient = createAuthClient()

/**
 * Topbar sign-in / sign-out (#47). Renders nothing when Better Auth is not
 * configured (PR previews, local mock) — same env gate as start.ts.
 * Sign-in links to our /sign-in page; sign-out posts to the Better Auth
 * handler client-side and lands back on the dashboard signed out.
 */
export function TopbarAuth({ auth, returnPathname }: TopbarAuthProps) {
	const { t } = useLocale()
	const navigate = useNavigate()
	if (!auth.configured) return null
	if (!auth.user) {
		return (
			<Link className="auth-link" href={`/sign-in?returnPathname=${encodeURIComponent(returnPathname)}`}>
				{t("auth.signIn")}
			</Link>
		)
	}
	const handleSignOut = async (event: React.MouseEvent) => {
		event.preventDefault()
		await authClient.signOut()
		await navigate({ to: "/" })
	}
	return (
		<>
			<Text size="sm" color="secondary" className="auth-user">
				{auth.user.firstName || auth.user.email}
			</Text>
			<Link className="auth-link" href="/api/auth/sign-out" onClick={handleSignOut}>
				{t("auth.signOut")}
			</Link>
		</>
	)
}
