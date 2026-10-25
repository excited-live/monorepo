import { Outlet, createRootRoute, HeadContent, Scripts, useRouteContext } from "@tanstack/react-router"
import { AppDocument } from "@excited-live/design-system"
import type { ReactNode } from "react"
import { DEFAULT_LOCALE, localeFromCookie, type Locale } from "@excited-live/i18n"
import { getTranslator } from "../lib/dictionaries"
import { LocaleProvider, useLocale } from "../lib/locale-context"
import "@astryxdesign/core/reset.css"
import "@astryxdesign/core/astryx.css"
import "@excited-live/design-system/mastercard-theme.css"
import "../styles.css"

export const Route = createRootRoute({
	beforeLoad: (ctx) => {
		// The global request middleware (src/start.ts) attaches `serverContext`
		// via router.options.additionalContext; it is typed `any` upstream.
		const serverContext = (ctx as { serverContext?: { locale?: Locale } }).serverContext
		const locale: Locale =
			serverContext?.locale ??
			(typeof document !== "undefined"
				? // Client navigation: cookie is the source of truth for explicit choice.
					(localeFromCookie(document.cookie) ?? DEFAULT_LOCALE)
				: DEFAULT_LOCALE)
		return { locale }
	},
	head: ({ match }) => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: getTranslator(match.context.locale).t("app.title") },
			{
				name: "description",
				content: getTranslator(match.context.locale).t("app.description"),
			},
			{ property: "og:title", content: "excited.live" },
			{
				property: "og:description",
				content: getTranslator(match.context.locale).t("app.description"),
			},
			{ property: "og:type", content: "website" },
			{ property: "og:image", content: "https://auth.excited.live/og-image.png" },
			{ name: "twitter:card", content: "summary_large_image" },
		],
		links: [
			{ rel: "icon", type: "image/png", href: "/favicon-32.png", sizes: "32x32" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;450;500;600;700&display=swap",
			},
		],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { locale } = useRouteContext({ from: Route.id })

	return (
		<LocaleProvider initialLocale={locale}>
			<RootDocument>
				<Outlet />
			</RootDocument>
		</LocaleProvider>
	)
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	const { locale } = useLocale()

	return (
		<AppDocument lang={locale} theme="light" head={<HeadContent />} scripts={<Scripts />}>
			{children}
		</AppDocument>
	)
}
