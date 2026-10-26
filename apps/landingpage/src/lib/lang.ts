/**
 * Language addressing for the bilingual landing (#197, design R3/R4).
 *
 * The launch ships two languages, English and Thai, and the switch has to be
 * addressable: `?lang=th` on `/` and `/docs/*`, plus `hreflang` for the pair so
 * a crawler or an agent sees both without clicking anything. The pages are
 * statically built, so the query is honoured by the pre-paint script in
 * `layout.astro` (the same place that restores `exl-lang`), never by the server.
 */

export type Lang = 'en' | 'th';

/** Every language that has content. R4: the picker may list nothing else. */
export const LANGS: readonly Lang[] = ['en', 'th'];

/** Parse a `lang` value from a query string or URLSearchParams. Unknown → null. */
export function langFromSearch(search: string | URLSearchParams): Lang | null {
	const params = typeof search === 'string' ? new URLSearchParams(search) : search;
	const value = params.get('lang');
	return value === 'en' || value === 'th' ? value : null;
}

export interface AlternateLink {
	hreflang: 'en' | 'th' | 'x-default';
	href: string;
}

/**
 * The address of a page in a given language (#197 R1): `?lang=th` for Thai and
 * the clean URL for English. Pure so the docs switch, the landing switch and
 * the pre-paint script can all write the same string.
 */
export function addressForLang(href: string | URL, lang: Lang): string {
	const url = new URL(typeof href === 'string' ? href : href.href, 'https://excited.live');
	if (lang === 'th') url.searchParams.set('lang', 'th');
	else url.searchParams.delete('lang');
	return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * `hreflang` for a page that carries both languages.
 *
 * `en` and `x-default` are the clean URL (that is what a visitor with no
 * preference should get); `th` is the same page with the language in the query.
 * The canonical stays the clean URL on every page, so the two never compete.
 */
export function alternateLinks(pathname: string, site: URL): AlternateLink[] {
	const en = new URL(pathname, site).href;
	const th = new URL(pathname, site);
	th.searchParams.set('lang', 'th');
	return [
		{ hreflang: 'en', href: en },
		{ hreflang: 'th', href: th.href },
		{ hreflang: 'x-default', href: en },
	];
}
