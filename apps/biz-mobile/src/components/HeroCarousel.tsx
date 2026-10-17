import React, { useRef, useState } from "react";
import type { EntityAccount } from "@excited-live/biz";
import { ChevronLeftIcon, ChevronRightIcon } from "@excited-live/design-system";

const SWIPE_THRESHOLD = 48;
const TAP_THRESHOLD = 20;

interface HeroCarouselProps {
	accounts: EntityAccount[];
	activeEntityId: string;
	onSelectEntity: (entityId: string) => void;
	onTap?: () => void;
	renderCard: (account: EntityAccount) => React.ReactNode;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
	accounts,
	activeEntityId,
	onSelectEntity,
	onTap,
	renderCard,
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
		<div className="hero-carousel-wrapper">
			<div
				className="hero-carousel"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={finishDrag}
				onPointerCancel={handlePointerCancel}
				style={{
					cursor: accounts.length > 1 ? (isDragging ? "grabbing" : "grab") : undefined,
				}}
			>
				<div
					className="hero-track"
					style={{
						transform: `translateX(calc(${-activeIndex * 100}% + ${dragOffset}px))`,
						transition: isDragging
							? "none"
							: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
					}}
				>
					{accounts.map((account) => (
						<div
							key={account.id}
							className="hero-slide"
							aria-hidden={account.id !== activeEntityId}
						>
							{renderCard(account)}
						</div>
					))}
				</div>
			</div>

			{accounts.length > 1 && (
				<div className="hero-pager" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
					<button
						type="button"
						className="hero-pager-btn"
						onClick={() => goToAccount(activeIndex - 1)}
						disabled={activeIndex === 0}
						aria-label="Previous organization"
					>
						<ChevronLeftIcon className="hero-pager-icon" aria-hidden="true" />
					</button>

					<div className="hero-pager-dots">
						{accounts.map((account, index) => (
							<button
								key={account.id}
								type="button"
								className={`hero-pager-dot ${index === activeIndex ? "active" : ""}`}
								onClick={() => goToAccount(index)}
								aria-label={`Show ${account.name}`}
								aria-current={index === activeIndex ? "true" : undefined}
							/>
						))}
					</div>

					<button
						type="button"
						className="hero-pager-btn"
						onClick={() => goToAccount(activeIndex + 1)}
						disabled={activeIndex === accounts.length - 1}
						aria-label="Next organization"
					>
						<ChevronRightIcon className="hero-pager-icon" aria-hidden="true" />
					</button>
				</div>
			)}
		</div>
	);
};
