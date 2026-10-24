import { CopyButton } from "./CopyButton"

/** A dark code deck with a label on the left and copy on the right. */
export function CodeDeck({ code, label, wrap = false }: { code: string; label: string; wrap?: boolean }) {
	return (
		<div className="stack" style={{ gap: 8 }}>
			<div className="code-head">
				<span className="tiny muted">{label}</span>
				<CopyButton value={code} />
			</div>
			<pre className={wrap ? "code" : "code"} style={wrap ? { whiteSpace: "pre-wrap", wordBreak: "break-word" } : undefined} tabIndex={0}>
				<code>{code}</code>
			</pre>
		</div>
	)
}
