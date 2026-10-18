import React, { useRef, useState } from "react";
import type { EntityAccount } from "@excited-live/biz";
import { ChevronLeftIcon, ChevronRightIcon, PlainButton } from "@excited-live/design-system";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { CapitalHeroCard } from "../CapitalHeroCard";

const PAGER_BTN =
	"inline-flex size-[30px] cursor-pointer items-center justify-center rounded-pill border border-white/60 bg-lifted/70 p-0 text-ink shadow-[0_2px_8px_rgba(20,20,19,0.05)] backdrop-blur-[16px] backdrop-saturate-[160%] transition-[transform,opacity,background] duration-150 [-webkit-tap-highlight-color:transparent] enabled:active:scale-90 enabled:active:bg-white/95 disabled:cursor-default disabled:opacity-35 disabled:shadow-none";

const SWIPE_THRESHOLD = 48;
const TAP_THRESHOLD = 20;

export interface HeroCarouselProps {
	accounts: EntityAccount[];
	activeEntityId: string;
	onSelectEntity?: (entityId: string) => void;
	onTap?: () => void;
	renderCard?: (account: EntityAccount) => React.ReactNode;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
	accounts,
	activeEntityId,
	onSelectEntity = () => {},
	onTap,
	renderCard = (account) => <CapitalHeroCard account={account} />,
}) => {
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const dragStartX = useRef<number | null>(null);
	const dragStartY = useRef<number | null>(null);
	const dragDeltaYRef = useRef(0);
	const dragOffsetRef = useRef(0);

	const activeIndex = Math.max(
		0,
		accounts.findIndex((a) => a.id === activeEntityId),
	);

	const goToAccount = (index: number) => {
		const next = accounts[Math.max(0, Math.min(accounts.length - 1, index))];
		if (next && next.id !== activeEntityId) onSelectEntity(next.id);
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (accounts.length < 2) return;
		dragStartX.current = e.clientX;
		dragStartY.current = e.clientY;
		dragDeltaYRef.current = 0;
		setIsDragging(true);
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (dragStartX.current === null) return;
		const delta = e.clientX - dragStartX.current;
		if (dragStartY.current !== null) {
			dragDeltaYRef.current = Math.abs(e.clientY - dragStartY.current);
		}
		const atStart = activeIndex === 0 && delta > 0;
		const atEnd = activeIndex === accounts.length - 1 && delta < 0;
		const nextOffset = atStart || atEnd ? delta * 0.35 : delta;
		dragOffsetRef.current = nextOffset;
		setDragOffset(nextOffset);
	};

	const finishDrag = () => {
		if (dragStartX.current === null) return;
		const delta = dragOffsetRef.current;
		const deltaY = dragDeltaYRef.current;
		dragStartX.current = null;
		dragStartY.current = null;
		dragDeltaYRef.current = 0;
		dragOffsetRef.current = 0;
		setIsDragging(false);
		setDragOffset(0);
		if (Math.abs(delta) > SWIPE_THRESHOLD) {
			goToAccount(activeIndex + (delta < 0 ? 1 : -1));
		} else if (Math.abs(delta) < TAP_THRESHOLD && deltaY < 24) {
			onTap?.();
		}
	};

	const handlePointerCancel = () => {
		dragStartX.current = null;
		dragStartY.current = null;
		dragDeltaYRef.current = 0;
		dragOffsetRef.current = 0;
		setIsDragging(false);
		setDragOffset(0);
	};

	return (
		<Stack gap={2} width="100%" className="min-w-0 gap-2.5">
			<Stack
				className="-my-1 -mb-[22px] touch-pan-y select-none overflow-hidden pt-1 pb-[22px]"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={finishDrag}
				onPointerCancel={handlePointerCancel}
				style={{
					cursor: accounts.length > 1 ? (isDragging ? "grabbing" : "grab") : undefined,
				}}
			>
				<HStack
					width="100%"
					className="will-change-transform"
					style={{
						transform: `translateX(calc(${-activeIndex * 100}% + ${dragOffset}px))`,
						transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
					}}
				>
					{accounts.map((account) => (
						<HStack
							key={account.id}
							className="min-w-0 flex-[0_0_100%] [&>*]:flex-1"
							aria-hidden={account.id !== activeEntityId}
						>
							{renderCard(account)}
						</HStack>
					))}
				</HStack>
			</Stack>

			{accounts.length > 1 && (
				<HStack
					gap={3}
					justify="center"
					align="center"
					onClick={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<PlainButton
						className={PAGER_BTN}
						onClick={() => goToAccount(activeIndex - 1)}
						disabled={activeIndex === 0}
						aria-label="Previous organization"
					>
						<ChevronLeftIcon className="block size-4" aria-hidden="true" />
					</PlainButton>

					<HStack gap={1.5} align="center">
						{accounts.map((account, index) => (
							<PlainButton
								key={account.id}
								className={`relative h-[7px] cursor-pointer rounded-pill p-0 transition-[width,background] duration-200 after:absolute after:-inset-1.5 after:content-[''] ${
									index === activeIndex ? "w-[18px] bg-ink" : "w-[7px] bg-ink/20"
								}`}
								onClick={() => goToAccount(index)}
								aria-label={`Show ${account.name}`}
								aria-current={index === activeIndex ? "true" : undefined}
							/>
						))}
					</HStack>

					<PlainButton
						className={PAGER_BTN}
						onClick={() => goToAccount(activeIndex + 1)}
						disabled={activeIndex === accounts.length - 1}
						aria-label="Next organization"
					>
						<ChevronRightIcon className="block size-4" aria-hidden="true" />
					</PlainButton>
				</HStack>
			)}
		</Stack>
	);
};
