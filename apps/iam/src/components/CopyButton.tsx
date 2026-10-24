import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Copy-to-clipboard with visible confirmation.
 *
 * `navigator.clipboard` needs a secure context; the fallback keeps the button
 * working on plain-HTTP LAN previews (a real case for this app: prelive API on
 * a worker URL, iam on localhost).
 */
export function CopyButton({ value, label = "Copy", copiedLabel = "Copied" }: {
	value: string
	label?: string
	copiedLabel?: string
}) {
	const [copied, setCopied] = useState(false)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current)
	}, [])

	const copy = useCallback(async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value)
			} else {
				const area = document.createElement("textarea")
				area.value = value
				area.setAttribute("readonly", "")
				area.style.position = "fixed"
				area.style.opacity = "0"
				document.body.appendChild(area)
				area.select()
				document.execCommand("copy")
				document.body.removeChild(area)
			}
			setCopied(true)
			if (timer.current) clearTimeout(timer.current)
			timer.current = setTimeout(() => setCopied(false), 1800)
		} catch {
			setCopied(false)
		}
	}, [value])

	return (
		<button type="button" className="copy" onClick={copy} data-copied={copied}>
			<span aria-live="polite">{copied ? copiedLabel : label}</span>
		</button>
	)
}
