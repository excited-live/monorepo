import { useEffect, useRef } from "react";

export function useModalBack(isOpen: boolean, onClose: () => void) {
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!isOpen) return;

		// 1. Lock background page scroll completely (html + body + touch-action)
		const prevBodyOverflow = document.body.style.overflow;
		const prevHtmlOverflow = document.documentElement.style.overflow;
		const prevTouchAction = document.body.style.touchAction;

		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";
		document.body.style.touchAction = "none";

		// 2. Track visual viewport to float sticky action button right on top of Android virtual keyboard
		const updateViewport = () => {
			const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
			document.documentElement.style.setProperty("--visual-viewport-h", `${height}px`);
		};

		updateViewport();

		const vv = window.visualViewport;
		if (vv) {
			vv.addEventListener("resize", updateViewport);
			vv.addEventListener("scroll", updateViewport);
		} else {
			window.addEventListener("resize", updateViewport);
		}

		// 3. Intercept Android back swipe gesture
		const stateKey = `modal_${Date.now()}`;
		window.history.pushState({ [stateKey]: true, isModal: true }, "");

		const handlePopState = (e: PopStateEvent) => {
			onCloseRef.current();
		};

		window.addEventListener("popstate", handlePopState);

		return () => {
			document.body.style.overflow = prevBodyOverflow;
			document.documentElement.style.overflow = prevHtmlOverflow;
			document.body.style.touchAction = prevTouchAction;

			if (vv) {
				vv.removeEventListener("resize", updateViewport);
				vv.removeEventListener("scroll", updateViewport);
			} else {
				window.removeEventListener("resize", updateViewport);
			}
			document.documentElement.style.removeProperty("--visual-viewport-h");

			window.removeEventListener("popstate", handlePopState);
		};
	}, [isOpen]);

	const dismiss = () => {
		if (window.history.state?.isModal) {
			window.history.back();
		} else {
			onClose();
		}
	};

	return { dismiss };
}
