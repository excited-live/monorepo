import React from "react";
import { NativeInput, NativeSelect, NativeTextArea } from "@excited-live/design-system";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type {
	NativeInputProps,
	NativeSelectProps,
	NativeTextAreaProps,
} from "@excited-live/design-system";

/** Shared look of every native control: white 14px-radius field, ink focus ring. */
export const FIELD_CLASS =
	"w-full min-w-0 rounded-[14px] border border-line bg-white px-3.5 py-[13px] text-[16px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:shadow-[0_0_0_2px_rgba(20,20,19,0.08)] disabled:opacity-80";

export interface FormFieldProps {
	label: React.ReactNode;
	/** Small helper text under the control. */
	hint?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

/** Uppercase eyebrow label + control (+ optional hint). The label wraps the control. */
export const FormField: React.FC<FormFieldProps> = ({ label, hint, children, className = "" }) => (
	<Stack as="label" gap={1.5} width="100%" className={`min-w-0 ${className}`}>
		<Text className="text-[12px] font-bold uppercase tracking-[0.04em] text-slate">{label}</Text>
		{children}
		{hint && <Text className="text-[11px] text-slate">{hint}</Text>}
	</Stack>
);

type FieldChrome = Pick<FormFieldProps, "label" | "hint"> & { fieldClassName?: string };

export const InputField: React.FC<FieldChrome & NativeInputProps> = ({
	label,
	hint,
	fieldClassName,
	className = "",
	...props
}) => (
	<FormField label={label} hint={hint} className={fieldClassName}>
		<NativeInput className={`${FIELD_CLASS} ${className}`} {...props} />
	</FormField>
);

export const SelectField: React.FC<FieldChrome & NativeSelectProps> = ({
	label,
	hint,
	fieldClassName,
	className = "",
	...props
}) => (
	<FormField label={label} hint={hint} className={fieldClassName}>
		<NativeSelect className={`${FIELD_CLASS} ${className}`} {...props} />
	</FormField>
);

export const TextAreaField: React.FC<FieldChrome & NativeTextAreaProps> = ({
	label,
	hint,
	fieldClassName,
	className = "",
	...props
}) => (
	<FormField label={label} hint={hint} className={fieldClassName}>
		<NativeTextArea className={`${FIELD_CLASS} ${className}`} {...props} />
	</FormField>
);
