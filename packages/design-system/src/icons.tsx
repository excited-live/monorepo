import { type ReactNode, type SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

interface SvgIconProps extends IconProps {
	children: ReactNode;
}

/**
 * Base for stroke icons. Renders the raw <svg> host — this is the ONE place
 * in the design system allowed to emit an untyped svg element.
 */
export function SvgIcon({ children, ...props }: SvgIconProps) {
	return (
		<svg
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			{children}
		</svg>
	);
}

function rawIcon(paths: ReactNode) {
	function Icon(props: IconProps) {
		return <SvgIcon {...props}>{paths}</SvgIcon>;
	}
	return Icon;
}

export const MoonIcon = rawIcon(<path d="M20.4 15.1A8.2 8.2 0 0 1 8.9 3.6 8.2 8.2 0 1 0 20.4 15.1Z" />);
export const SunIcon = rawIcon(
	<>
		<circle cx="12" cy="12" r="3.4" />
		<path d="M12 2.4v2M12 19.6v2M21.6 12h-2M4.4 12h-2M18.79 5.21l-1.42 1.42M6.63 17.37l-1.42 1.42M18.79 18.79l-1.42-1.42M6.63 6.63 5.21 5.21" />
	</>,
);
export const LinkIcon = rawIcon(
	<>
		<path d="m9.5 14.5 5-5" />
		<path d="M7.3 17.1H6a3.5 3.5 0 0 1 0-7h3.2M16.7 6.9H18a3.5 3.5 0 0 1 0 7h-3.2" />
	</>,
);
export const CompassIcon = rawIcon(
	<>
		<circle cx="12" cy="12" r="8.2" />
		<path d="m15.6 8.4-1.9 5.3-5.3 1.9 1.9-5.3 5.3-1.9Z" />
	</>,
);
export const CalendarIcon = rawIcon(
	<>
		<rect x="4" y="5.5" width="16" height="14" rx="1.8" />
		<path d="M8 3.5v4M16 3.5v4M4 9.5h16M8.1 13h.01M12 13h.01M15.9 13h.01M8.1 16.4h.01M12 16.4h.01" />
	</>,
);
export const BookmarkIcon = rawIcon(
	<path d="M6.5 4.2c0-.66.54-1.2 1.2-1.2h8.6c.66 0 1.2.54 1.2 1.2v16l-5.5-3.5-5.5 3.5v-16Z" />,
);
export const ChartIcon = rawIcon(
	<>
		<path d="M4 19.5V4.5M4 19.5h16" />
		<path d="m7 15 3-3 2.2 1.7 4.8-6.2" />
	</>,
);
export const HomeIcon = rawIcon(
	<path d="M4.5 10.3 12 4.4l7.5 5.9v8.4a1.4 1.4 0 0 1-1.4 1.4h-3.9v-5.4H9.8v5.4H5.9a1.4 1.4 0 0 1-1.4-1.4v-8.4Z" />,
);
export const WalletIcon = rawIcon(
	<>
		<rect x="3.4" y="6" width="17.2" height="12.4" rx="2.6" />
		<path d="M3.4 9.8h17.2" />
		<path d="M7 14.4h3.2" />
	</>,
);
export const ChevronLeftIcon = rawIcon(<path d="M14.5 5.5 8 12l6.5 6.5" />);
export const ChevronRightIcon = rawIcon(<path d="M9.5 5.5 16 12l-6.5 6.5" />);
export const TuneIcon = rawIcon(
	<>
		<path d="M4 7.5h9M17.5 7.5H20" />
		<circle cx="15" cy="7.5" r="2.2" />
		<path d="M4 16.5h3M11.5 16.5H20" />
		<circle cx="9" cy="16.5" r="2.2" />
	</>,
);
export const UserIcon = rawIcon(
	<>
		<circle cx="12" cy="8" r="3.6" />
		<path d="M5.5 19.5c.8-3.2 3.4-4.9 6.5-4.9s5.7 1.7 6.5 4.9" />
	</>,
);
export const LedgerIcon = rawIcon(
	<>
		<path d="M5.2 5.2a1.7 1.7 0 0 1 1.7-1.7h10.2a1.6 1.6 0 0 1 1.6 1.6v15.4H7.2a2 2 0 0 1-2-2V5.2Z" />
		<path d="M5.2 17.1a2 2 0 0 1 2-2h11.5" />
		<path d="M9.2 8h5.8M9.2 11h4" />
	</>,
);
export const PresentationIcon = rawIcon(
	<>
		<rect x="4" y="4" width="16" height="11.5" rx="1.6" />
		<path d="M12 15.5v4M8.5 19.5h7M8 8.2h8M12 8.2v4.1M9.8 12.3h4.4" />
	</>,
);
export const SettingsIcon = rawIcon(
	<>
		<circle cx="12" cy="12" r="2.5" />
		<path d="m19.1 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1A1.7 1.7 0 0 1 5 15l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9L5 5.6A1.7 1.7 0 0 1 7.4 3.2l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
	</>,
);
export const ArrowRightIcon = rawIcon(<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />);
export const SendIcon = rawIcon(<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />);
export const MinimizeIcon = rawIcon(<path d="M6 9.5 12 15.5 18 9.5" />);
export const ChatIcon = rawIcon(
	<>
		<path d="M21 11.6c0 4.2-4 7.6-9 7.6-1 0-2-.14-2.9-.4L4 20l1.2-3.6C4 15.1 3 13.4 3 11.6 3 7.4 7 4 12 4s9 3.4 9 7.6Z" />
		<path d="M8.6 11.5h.01M12 11.5h.01M15.4 11.5h.01" />
	</>,
);

export function FeyMark({ size = 24 }: { size?: number }) {
	return (
		<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
			<path d="M16.74 2.76c1.46 1.46 1.46 3.82 0 5.28l-6.9 6.9-2.32-2.32 6.9-6.9a3.73 3.73 0 0 1 2.32-1.09Z" />
			<path d="M17.38 8.88c1.18 1.18 1.18 3.1 0 4.28l-5.82 5.82-2.32-2.32 5.82-5.82a3.02 3.02 0 0 1 2.32-1.96Z" />
			<path d="M14.34 15.62c.92.92.92 2.41 0 3.33l-2.29 2.29-2.32-2.32 2.29-2.29c.64-.64 1.68-.99 2.32-1.01Z" />
		</svg>
	);
}

export interface BizOrbitMarkProps {
	size?: number;
	variant?: "default" | "inverted" | "monochrome" | "reversed";
	className?: string;
}

/**
 * excited.live Bold 'b' Official Mark — outline edition.
 * Stroked union contour of capsule stem + circular bowl, orange core dot.
 * No fills: transparent inside and out, reads clean on any surface.
 * - default: Ink Black stroke + Signal Orange core (for cream/light backgrounds)
 * - reversed: Signal Orange stroke + Ink Black core
 * - inverted: Lifted Cream stroke + Luminous Orange core (for ink/dark backgrounds)
 * - monochrome: All currentColor
 */
export function BizOrbitMark({
	size = 24,
	variant = "default",
	className,
}: BizOrbitMarkProps) {
	const isDark = variant === "inverted";
	const isReversed = variant === "reversed";
	const isMono = variant === "monochrome";

	const strokeColor = isReversed
		? "var(--signal-orange, #CF4500)"
		: isDark
			? "#FCFBFA"
			: "var(--ink-black, #141413)";

	const coreColor = isReversed
		? "var(--ink-black, #141413)"
		: isDark
			? "#F37338"
			: "var(--signal-orange, #CF4500)";

	return (
		<svg
			aria-hidden="true"
			width={size}
			height={size}
			viewBox="0 0 1024 1024"
			fill="none"
			className={className}
		>
			<path
				d="M288.96 308.64 A70.52 70.52 0 0 1 430 308.64 L430 380.28 A213.2 213.2 0 1 1 401.76 748.85 A70.52 70.52 0 0 1 288.96 692.4 Z"
				stroke={isMono ? "currentColor" : strokeColor}
				strokeWidth="72"
				strokeLinejoin="round"
			/>
			<circle
				cx="521.84"
				cy="572.68"
				r="101.68"
				fill={isMono ? "currentColor" : coreColor}
			/>
		</svg>
	);
}
