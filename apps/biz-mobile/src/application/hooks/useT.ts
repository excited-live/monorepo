import type { Translator } from "@excited-live/i18n";
import { useMemo } from "react";
import { getTranslator } from "../../i18n";
import { useAppUI } from "./useAppUI";

/** Translator bound to the active locale: `const { t } = useT();` */
export function useT(): Translator {
	const { lang } = useAppUI();
	return useMemo(() => getTranslator(lang), [lang]);
}
