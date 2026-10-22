import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "../utils/clipboard";

export type CopyState = "idle" | "copied" | "failed";

/** Copy helper with a short-lived "Copied" state for button labels. */
export function useCopyToClipboard(resetMs = 2000) {
	const [state, setState] = useState<CopyState>("idle");
	const timer = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (timer.current) window.clearTimeout(timer.current);
		},
		[],
	);

	const copy = useCallback(
		async (text: string) => {
			const ok = await copyText(text);
			setState(ok ? "copied" : "failed");
			if (timer.current) window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => setState("idle"), resetMs);
			return ok;
		},
		[resetMs],
	);

	return { state, copy };
}
