import "@astryxdesign/core/TextInput";

/**
 * Astryx spreads unknown props onto the native <input>, but its prop types omit
 * the mobile-keyboard / password-manager hints apps need. Widen them here.
 */
declare module "@astryxdesign/core/TextInput" {
	interface TextInputProps {
		autoComplete?: string;
		minLength?: number;
		required?: boolean;
	}
}
