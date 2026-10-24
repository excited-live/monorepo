import { Link, Outlet, useNavigate } from "@tanstack/react-router"
import { mastercardTheme } from "@excited-live/design-system"
import { Theme } from "@astryxdesign/core/theme"
import { signOut } from "../lib/hub-auth"
import { useGatewayHealth } from "../lib/queries"
import { useSession } from "../lib/session"
import { useThemeMode } from "../lib/theme"

const TABS = [
	{ to: "/", label: "Overview", hint: "agents" },
	{ to: "/data", label: "Data", hint: "inspect" },
	{ to: "/tokens", label: "API keys", hint: "scopes" },
] as const

/**
 * The app shell: brand, segmented tabs, gateway status, theme and identity.
 *
 * Tabs are real routes (not local state) so a deep link — e.g. the Data tab
 * focused on one endpoint — survives a reload and can be shared.
 */
export function Shell() {
	const { mode, toggle } = useThemeMode()
	const up = useGatewayHealth()
	const session = useSession()
	const navigate = useNavigate()

	const handleSignOut = async () => {
		await signOut()
		await navigate({ to: "/sign-in" })
	}

	return (
		<Theme theme={mastercardTheme} mode={mode}>
			<div className="iam-app">
				<header className="topbar">
					<Link to="/" className="brand" aria-label="iam.excited.live overview">
						<span className="brand-mark" aria-hidden="true">
							<span />
							<span />
						</span>
						<span className="brand-name">
							excited<em>.live</em>
						</span>
						<span className="brand-app">iam</span>
					</Link>

					<nav className="tabs" aria-label="Sections">
						{TABS.map((tab) => (
							<Link
								key={tab.to}
								to={tab.to}
								activeOptions={{ exact: tab.to === "/" }}
								activeProps={{ "aria-current": "page" }}
							>
								{tab.label}
								<small>{tab.hint}</small>
							</Link>
						))}
					</nav>

					<div className="topbar-actions">
						<span className="status-pill" title="Health of the single API origin">
							<span className="status-dot" data-state={up === false ? "down" : undefined} />
							{up === null ? "Checking API" : up ? "API online" : "API unreachable"}
						</span>
						<button
							type="button"
							className="icon-button"
							onClick={toggle}
							aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
							title={mode === "light" ? "Dark mode" : "Light mode"}
						>
							{mode === "light" ? "☾" : "☀"}
						</button>
						{session ? (
							<button
								type="button"
								className="user-chip"
								onClick={handleSignOut}
								title="Sign out"
								aria-label={`Signed in as ${session.user.email}. Sign out.`}
							>
								<span className="avatar" aria-hidden="true">
									{(session.user.name || session.user.email).slice(0, 1).toUpperCase()}
								</span>
								<span>{session.user.name || session.user.email}</span>
							</button>
						) : (
							<Link to="/sign-in" className="btn small">
								Sign in
							</Link>
						)}
					</div>
				</header>

				<main>
					<Outlet />
				</main>
			</div>
		</Theme>
	)
}
