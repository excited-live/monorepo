import React from "react";
import { createPortal } from "react-dom";
import { HStack, PlainButton, Stack, Text, Theme, mastercardTheme } from "@excited-live/design-system";

export interface ModalPageProps {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	/** Sticky action bar pinned to the bottom (submit / delete buttons). */
	footer?: React.ReactNode;
}

/**
 * Full-screen modal page rendered in a portal: title + close on top, scrollable
 * content, optional sticky footer. Pair with `useModalBack` for Android back.
 */
export const ModalPage: React.FC<ModalPageProps> = ({ title, onClose, children, footer }) =>
	createPortal(
		<Theme theme={mastercardTheme} mode="light">
			<Stack className="fixed inset-0 z-[9999] h-[var(--visual-viewport-h,100dvh)] max-h-[var(--visual-viewport-h,100dvh)] w-screen animate-modal-slide-up overflow-hidden overscroll-contain bg-cream">
				<HStack
					justify="between"
					align="center"
					className="shrink-0 pt-[max(14px,env(safe-area-inset-top))] pr-3.5 pb-2.5 pl-[18px]"
				>
					<Text className="text-[18px] font-bold text-ink">{title}</Text>
					<PlainButton
						onClick={onClose}
						aria-label="Close"
						className="flex items-center justify-center rounded-pill px-2.5 py-2 text-[20px] leading-none text-ink active:bg-ink/10"
					>
						✕
					</PlainButton>
				</HStack>

				<Stack
					gap={4}
					className="mx-auto w-full max-w-[480px] flex-1 touch-pan-y overflow-y-auto overscroll-contain px-[18px] py-2.5"
				>
					{children}
				</Stack>

				{footer && (
					<Stack
						gap={2}
						className="sticky bottom-0 z-30 mx-auto w-full max-w-[480px] shrink-0 bg-cream/75 px-[18px] pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-[28px] backdrop-saturate-[190%]"
					>
						{footer}
					</Stack>
				)}
			</Stack>
		</Theme>,
		document.body,
	);
