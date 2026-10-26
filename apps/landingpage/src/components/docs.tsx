import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsPage, type DocsPageProps } from 'fumadocs-ui/layouts/docs/page';
import type { Root } from 'fumadocs-core/page-tree';
import { useEffect, useState, type ReactNode } from 'react';
import { navigate } from 'astro:transitions/client';
import { RootProvider } from 'fumadocs-ui/provider/astro';
import type { AstroProviderProps } from 'fumadocs-core/framework/astro';
import SearchDialog from './search';
import { addressForLang } from '@/lib/lang';

/** The two languages the landing chrome and the docs prose share. */
type Lang = 'en' | 'th';

function readLang(): Lang {
	if (typeof document === 'undefined') return 'en';
	return document.documentElement.dataset.lang === 'th' ? 'th' : 'en';
}

/**
 * Docs language switch. Same state as the landing picker (`html[data-lang]` +
 * `localStorage['exl-lang']`), so a visitor who chose Thai on the landing keeps
 * it here and vice versa. Purely CSS after the click: `html[data-lang='en']
 * [data-lang-th]` is hidden, so no copy is re-rendered or re-fetched.
 */
function LangSwitch() {
	const [lang, setLang] = useState<Lang>('en');

	useEffect(() => {
		setLang(readLang());
		const observer = new MutationObserver(() => setLang(readLang()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-lang'],
		});
		return () => observer.disconnect();
	}, []);

	const choose = (next: Lang) => {
		setLang(next);
		document.documentElement.dataset.lang = next;
		document.documentElement.lang = next;
		try {
			localStorage.setItem('exl-lang', next);
		} catch {
			/* storage unavailable — the choice lasts this page */
		}
		// #197 R1: the address carries the language — `?lang=th` for Thai, the
		// clean URL for English — so copying the URL keeps the choice.
		try {
			history.replaceState(history.state, '', addressForLang(window.location.href, next));
		} catch {
			/* sandboxed frame — the language still applies */
		}
		window.gtag?.('event', 'lang_toggle', { lang: next, surface: 'docs' });
	};

	return (
		<div className="docs-lang-switch" role="group" aria-label="Language">
			{(['en', 'th'] as const).map((value) => (
				<button
					key={value}
					type="button"
					className="docs-lang-switch__btn"
					aria-pressed={lang === value}
					aria-current={lang === value ? 'true' : 'false'}
					lang={value}
					onClick={() => choose(value)}
				>
					{value === 'en' ? 'EN' : 'ไทย'}
				</button>
			))}
		</div>
	);
}

export function Docs({
	tree,
	children,
	pathname,
	params,
	page,
}: {
	tree: Root;
	children: ReactNode;
	pathname: string;
	params: AstroProviderProps['params'];
	page?: DocsPageProps;
}) {
	return (
		<RootProvider
			pathname={pathname}
			params={params}
			navigate={navigate}
			theme={{ enabled: false }}
			search={{ SearchDialog }}
		>
			<DocsLayout
				tree={tree}
				themeSwitch={{ enabled: false }}
				nav={{
					title: (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<img
								src="/logo-mark.png"
								alt="excited.live"
								width={26}
								height={26}
								style={{ borderRadius: 999, display: 'block' }}
							/>
							<span
								style={{
									fontWeight: 600,
									fontSize: 17,
									letterSpacing: '-0.02em',
									color: '#141413',
								}}
							>
								excited<span style={{ color: '#CF4500' }}>.live</span>
							</span>
						</span>
					),
					children: <LangSwitch />,
				}}
			>
				<DocsPage {...page}>{children}</DocsPage>
			</DocsLayout>
		</RootProvider>
	);
}
