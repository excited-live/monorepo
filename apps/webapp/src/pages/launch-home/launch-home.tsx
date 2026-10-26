import { useEffect, useRef, useState } from "react"
import { Button } from "@astryxdesign/core/Button"
import { Heading } from "@astryxdesign/core/Heading"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { Link } from "@excited-live/design-system"
import { useLocale } from "../../lib/locale-context"

export interface LaunchHomeProps {
	/** Absolute MCP endpoint for this environment. */
	mcpUrl: string
}

type CopyState = "idle" | "copied" | "failed"

/**
 * Signed-in launch home (#65).
 *
 * The plan dashboard is being redesigned and is not in the 2026-10-31 launch,
 * so `/` lands on surfaces that exist: connect an agent over MCP, open settings,
 * and a deliberate "coming after launch" empty state instead of an error.
 */
export function LaunchHome({ mcpUrl }: LaunchHomeProps) {
	const { t } = useLocale()
	const [copyState, setCopyState] = useState<CopyState>("idle")
	const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (resetTimer.current) clearTimeout(resetTimer.current)
		}
	}, [])

	const copyEndpoint = async () => {
		if (resetTimer.current) clearTimeout(resetTimer.current)
		try {
			if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable")
			await navigator.clipboard.writeText(mcpUrl)
			setCopyState("copied")
		} catch {
			setCopyState("failed")
		}
		resetTimer.current = setTimeout(() => setCopyState("idle"), 4000)
	}

	const copyLabel =
		copyState === "copied"
			? t("launchHome.copied")
			: copyState === "failed"
				? t("launchHome.copyFailedLabel")
				: t("launchHome.copy")

	return (
		<Stack className="chart-panel__inner launch-home" gap={4}>
			<Stack gap={2} className="launch-home__intro">
				<Text className="launch-home__eyebrow">{t("launchHome.eyebrow")}</Text>
				<Heading level={1} type="display-2">
					{t("launchHome.title")}
				</Heading>
				<Text color="secondary" className="launch-home__lede">
					{t("launchHome.lede")}
				</Text>
			</Stack>

			<Stack gap={2} className="launch-home__connect">
				<Text weight="semibold">{t("launchHome.mcpLabel")}</Text>
				<Stack
					direction="horizontal"
					vAlign="center"
					gap={2}
					className="launch-home__endpoint-row"
				>
					<code className="launch-home__endpoint">{mcpUrl}</code>
					<Button
						variant="secondary"
						size="sm"
						label={copyLabel}
						onClick={() => void copyEndpoint()}
					/>
				</Stack>
				<Text size="sm" color="secondary">
					{t("launchHome.authNote")}
				</Text>
				<Text size="sm" color="secondary">
					{t("launchHome.mcpNote")}
				</Text>
				<Text size="sm" className="launch-home__status" role="status" aria-live="polite">
					{copyState === "copied"
						? t("launchHome.copiedStatus")
						: copyState === "failed"
							? t("launchHome.copyFailed")
							: ""}
				</Text>
				<Stack direction="horizontal" gap={3} className="launch-home__links">
					<Link
						className="launch-home__link"
						href="https://excited.live/docs/help"
						target="_blank"
						rel="noreferrer"
					>
						{t("launchHome.help")}
					</Link>
					<Link className="launch-home__link" href="/settings">
						{t("launchHome.settings")}
					</Link>
				</Stack>
			</Stack>

			<Stack gap={2} className="launch-home__empty">
				<Heading level={2}>{t("launchHome.emptyTitle")}</Heading>
				<Text color="secondary">{t("launchHome.emptyBody")}</Text>
				<Text size="sm" color="secondary">
					{t("launchHome.emptyNote")}
				</Text>
			</Stack>
		</Stack>
	)
}

export default LaunchHome
