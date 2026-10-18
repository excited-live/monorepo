import { createTranslator, DEFAULT_LOCALE, type Locale, toLocale, type Translator } from "@excited-live/i18n";
import { strings } from "./dictionary";

export { DEFAULT_LOCALE, LOCALES, type Locale } from "@excited-live/i18n";

const LOCALE_STORAGE_KEY = "excited_live_mobile_locale";
const translators = new Map<Locale, Translator>();

export function getTranslator(locale: Locale): Translator {
	let translator = translators.get(locale);
	if (!translator) {
		translator = createTranslator({ en: strings, th: strings }, locale);
		translators.set(locale, translator);
	}
	return translator;
}

/** Non-hook lookup for code that already has `lang` in hand. Prefer `useT()` in components. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, vars?: Record<string, string | number>): string {
	const strVars = vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));
	return getTranslator(locale).t(key, strVars);
}

/** Initial locale: saved choice, then the device language, then English. No SSR here, so device APIs are safe. */
export function resolveInitialLocale(): Locale {
	let saved: string | null = null;
	try {
		saved = localStorage.getItem(LOCALE_STORAGE_KEY);
	} catch {
		// Storage unavailable (private mode / tests): fall through to device language.
	}
	const device = typeof navigator === "undefined" ? undefined : navigator.language;
	return toLocale(saved) ?? toLocale(device) ?? DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale): void {
	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, locale);
	} catch {
		// Non-fatal: the choice just won't survive a restart.
	}
}
