import React, { useState, useEffect } from "react";
import { Img, PlainButton } from "@excited-live/design-system";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { EntityThumb } from "../EntityThumb";
import { useModalBack } from "../../hooks/useModalBack";
import { calculateEntityCashOnHand } from "@excited-live/accounting";
import { useFinances, useAppUI } from "../../state";
import { formatMoney } from "../../utils/format";
import { GLASS_PILL } from "../../utils/ui";

export const Header: React.FC = () => {
	const { accounts, hardware, subscriptions, revenues, liabilities, transfers } = useFinances();
	const { activeEntityId, setActiveEntityId, activeTab, today } = useAppUI();
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 4);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const { dismiss } = useModalBack(isOpen, () => setIsOpen(false));

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isCentered = activeTab === "home" || activeTab === "settings";
	const isDarkBg = activeTab === "capital" && activeAccount.type === "business";
	const onDark = isDarkBg && !isScrolled;

	return (
		<>
			<Stack
				as="header"
				className={`sticky top-0 z-50 -mx-4 w-[calc(100%+32px)] items-stretch pt-[max(14px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pb-2.5 pl-[max(16px,env(safe-area-inset-left))] transition-[background,backdrop-filter,box-shadow] duration-200 ${
					isScrolled
						? "bg-cream/70 shadow-[0_4px_24px_rgba(20,20,19,0.05)] backdrop-blur-[28px] backdrop-saturate-[190%]"
						: "bg-transparent"
				}`}
			>
				<HStack width="100%" align="center" justify={isCentered ? "center" : "between"}>
					<HStack
						gap={2}
						align="center"
						aria-label="excited.live logo"
						className="shrink-0 cursor-default select-none py-1"
					>
						<Img src="/logo-mark.png" alt="" className="block h-6 w-7 object-contain" />
						<Text
							as="div"
							className={`flex items-baseline text-[16.5px] leading-none ${onDark ? "[text-shadow:0_1px_4px_rgba(0,0,0,0.5)]" : ""}`}
						>
							<Text className={`text-[16.5px] font-bold tracking-[-0.03em] ${onDark ? "text-cream" : "text-ink"}`}>
								excited
							</Text>
							<Text className="text-[16.5px] font-extrabold text-signal">.</Text>
							<Text className="inline-block bg-[linear-gradient(135deg,#cf4500_0%,#f37338_100%)] bg-clip-text text-[16px] font-bold tracking-[-0.02em] text-transparent">
								live
							</Text>
						</Text>
					</HStack>

					{activeTab === "capital" && (
						<PlainButton
							onClick={() => setIsOpen(true)}
							aria-label="Switch Entity"
							className={`inline-flex max-w-[190px] cursor-pointer items-center gap-2 px-3.5 py-[7px] text-[13.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
								onDark
									? "rounded-pill border border-white/20 bg-ink/65 text-cream [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]"
									: `${GLASS_PILL} text-ink active:bg-[#eae6e2]/90`
							}`}
						>
							<Text className="truncate [font:inherit]">{activeAccount.name}</Text>
							<Text className={`text-[11px] ${onDark ? "text-cream/70" : "text-slate"}`}>▾</Text>
						</PlainButton>
					)}
				</HStack>
			</Stack>

			{/* Entity Switcher Sheet */}
			<BottomSheet label="Switch Account" isOpen={isOpen} onOpenChange={(open) => !open && dismiss()}>
				<Stack gap={4} className="px-6 pt-5 pb-[max(32px,env(safe-area-inset-bottom))]">
					<Stack gap={0.5}>
						<Heading level={3} className="text-[18px] font-bold text-ink">
							Switch Account
						</Heading>
						<Text className="text-[13px] text-slate">Select treasury perspective</Text>
					</Stack>

					<Stack gap={2} width="100%">
						{accounts.map((acc) => {
							const isSelected = acc.id === activeEntityId;
							return (
								<PlainButton
									key={acc.id}
									className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-3xl border bg-white px-4 py-3.5 text-left transition-[transform,border-color,box-shadow] duration-100 active:scale-[0.985] ${
										isSelected ? "border-ink shadow-[inset_0_0_0_1px_var(--ink-black)]" : "border-line"
									}`}
									onClick={() => {
										setActiveEntityId(acc.id);
										dismiss();
									}}
								>
									<EntityThumb imageUrl={acc.imageUrl} name={acc.name} className="size-10 min-w-10 rounded-[10px]" />
									<Stack gap={0.5} align="start" className="min-w-0 flex-1">
										<Text maxLines={1} className="text-[15px] font-bold text-ink">
											{acc.name}
										</Text>
										<Badge variant="neutral" label={acc.type === "business" ? "Business" : "Personal"} />
									</Stack>
									<Stack gap={0.5} align="end" className="shrink-0">
										<Text className="text-[14px] font-bold text-ink">฿
											{formatMoney(
												calculateEntityCashOnHand({
													account: acc,
													hardware,
													subscriptions,
													revenues,
													liabilities,
													transfers,
													yearMonth: today.slice(0, 7),
												}),
											)}</Text>
										<Text className="text-[11px] text-slate">THB</Text>
									</Stack>
								</PlainButton>
							);
						})}
					</Stack>
				</Stack>
			</BottomSheet>
		</>
	);
};
