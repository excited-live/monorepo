/**
 * Copy text with a fallback for WebViews that expose no async clipboard.
 * Returns false when both paths fail so the UI can tell the user to select it.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall through to the DOM path.
	}

	try {
		const area = document.createElement("textarea");
		area.value = text;
		area.setAttribute("readonly", "");
		area.style.position = "fixed";
		area.style.top = "0";
		area.style.left = "0";
		area.style.opacity = "0";
		document.body.appendChild(area);
		area.select();
		const copied = document.execCommand("copy");
		document.body.removeChild(area);
		return copied;
	} catch {
		return false;
	}
}
