import { useEffect, useState } from 'react';
import { Selector } from '@astryxdesign/core/Selector';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import { addressForLang } from '@/lib/lang';

interface LangSelectProps {
	variant?: 'light' | 'dark';
}

// Text-only labels (#197 R3: no flags, no country names). Kept for the Astryx
// variant of the switch; the shipped landing uses the native menu in
// index.astro, and both write the same `?lang=` address.
const OPTIONS = [
	{ value: 'en', label: 'English' },
	{ value: 'th', label: 'ไทย' },
];

function readLang(): 'en' | 'th' {
	if (typeof document === 'undefined') return 'en';
	return document.documentElement.dataset.lang === 'th' ? 'th' : 'en';
}

export default function LangSelect({ variant = 'light' }: LangSelectProps) {
	// Start unsynced: SSR can't read localStorage, and the inline boot script may
	// have already set html[data-lang='th'] — rendering 'en' then would flash the
	// wrong label before hydration. Render an empty trigger until synced.
	const [lang, setLang] = useState<'en' | 'th' | null>(null);

	useEffect(() => {
		setLang(readLang());
		const observer = new MutationObserver(() => setLang(readLang()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-lang'],
		});
		return () => observer.disconnect();
	}, []);

	const handleChange = (value: string) => {
		const nextLang = value === 'th' ? 'th' : 'en';
		setLang(nextLang);
		window.gtag?.('event', 'lang_toggle', { lang: nextLang });
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.lang = nextLang;
			document.documentElement.lang = nextLang;
			try {
				localStorage.setItem('exl-lang', nextLang);
			} catch {
				/* storage unavailable */
			}
			try {
				history.replaceState(history.state, '', addressForLang(window.location.href, nextLang));
			} catch {
				/* sandboxed frame */
			}
		}
	};

	return (
		<div className={variant === 'dark' ? 'lang-island lang-island--dark' : 'lang-island'}>
			{lang === null ? null : (
				<Theme theme={neutralTheme}>
					<Selector
						label="Language"
						isLabelHidden
						size="sm"
						options={OPTIONS}
						value={lang}
						onChange={handleChange}
					/>
				</Theme>
			)}
		</div>
	);
}
