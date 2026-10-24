/**
 * @excited-live/design-system — the brand layer for excited.live apps.
 *
 * Owns: the Mastercard theme, the document shell, zero-style native/brand
 * primitives, the stroke icon set, and the Astryx `TextInput` type widening.
 *
 * Astryx components are NOT re-exported here: app code imports them from
 * `@astryxdesign/core/<Component>` directly. See the design_system skill for
 * the full contract.
 */
import "./astryxAugment";
export { AppDocument, type AppDocumentProps } from "./AppDocument";
export { Img, type ImgProps } from "./Img";
export { PlainButton, type PlainButtonProps } from "./PlainButton";
export { Link, type LinkProps } from "./Link";
export {
	NativeInput,
	NativeSelect,
	NativeTextArea,
	type NativeInputProps,
	type NativeSelectProps,
	type NativeTextAreaProps,
} from "./NativeFields";
export {
	Svg,
	SvgLine,
	SvgPath,
	SvgCircle,
	SvgDefs,
	SvgGradientStop,
	SvgRect,
	type SvgProps,
	type SvgLineProps,
	type SvgPathProps,
	type SvgCircleProps,
	type SvgDefsProps,
	type SvgGradientStopProps,
	type SvgRectProps,
} from "./Svg";
export {
	SvgIcon,
	FeyMark,
	ChatIcon,
	MoonIcon,
	SunIcon,
	LinkIcon,
	CompassIcon,
	CalendarIcon,
	BookmarkIcon,
	ChartIcon,
	HomeIcon,
	WalletIcon,
	BriefcaseIcon,
	ReceiptIcon,
	CardIcon,
	BuildingIcon,
	BoxIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	TuneIcon,
	UserIcon,
	LedgerIcon,
	PresentationIcon,
	SettingsIcon,
	ArrowRightIcon,
	SendIcon,
	MinimizeIcon,
	type IconProps,
} from "./icons";
export { mastercardTheme } from "./mastercard";
