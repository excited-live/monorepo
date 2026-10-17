import { type InputHTMLAttributes, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export type NativeInputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };
export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> };
export type NativeTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

/**
 * Zero-style native form controls. Use where the OS control is the point (mobile
 * date/month pickers, <select> sheets, numeric keyboards) and Astryx's custom
 * inputs would regress the native UX. All styling comes from the app.
 */
export function NativeInput(props: NativeInputProps) {
	return <input {...props} />;
}

export function NativeSelect(props: NativeSelectProps) {
	return <select {...props} />;
}

export function NativeTextArea(props: NativeTextAreaProps) {
	return <textarea {...props} />;
}
