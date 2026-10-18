import React from "react";
import { Img, PlainButton } from "@excited-live/design-system";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { EntityThumb } from "../../../../components/EntityThumb";
import { ListItemCard } from "../../../../components/ListItemCard";
import type { EntityAccount } from "@excited-live/accounting";
import { calculatePaydayCountdown as defaultCalculatePaydayCountdown } from "../../../../domain/selectors";
import { formatMoney } from "../../../../utils/format";
import { t } from "../../../../utils/i18n";
import type { MobileLocale } from "../../../../domain/types";

export interface HomeEntitiesSectionProps {
	accounts: EntityAccount[];
	lang?: MobileLocale;
	onAddBusiness?: () => void;
	onSelectAccount?: (accId: string) => void;
	onOpenCareerEdit?: (acc: EntityAccount) => void;
	treasury?: (acc: EntityAccount) => number;
	eomTreasury?: (acc: EntityAccount) => number;
	formatType?: (type: string) => string;
	calculatePaydayCountdown?: (day?: number) => string | null;
}

export const HomeEntitiesSection: React.FC<HomeEntitiesSectionProps> = ({
	accounts,
	lang = "en",
	onAddBusiness = () => {},
	onSelectAccount = () => {},
	onOpenCareerEdit = () => {},
	treasury = (acc) => acc.cashReserve,
	eomTreasury = (acc) => acc.cashReserve,
	formatType = (entityType) => (entityType === "personal" ? t("home.personal", lang) : t("home.businesses", lang)),
	calculatePaydayCountdown = defaultCalculatePaydayCountdown,
}) => {
	return (
		<Stack gap={2} className="gap-2.5" width="100%">
			<HStack width="100%" justify="between" align="center">
				<Text className="text-[12px] font-bold uppercase tracking-wider text-slate">{t("section.entities", lang)}</Text>
				<Button label={t("action.addBusiness", lang)} variant="primary" size="sm" onClick={onAddBusiness} />
			</HStack>

			<Stack gap={2} width="100%">
				{accounts.map((acc) => {
					const hasCareer = acc.type === "personal" && Boolean(acc.careerTitle || acc.careerCompany || acc.salary);
					const countdown = calculatePaydayCountdown(acc.paydayDayOfMonth);
					return (
						<ListItemCard key={acc.id} isStacked={hasCareer}>
							<HStack
								role="button"
								tabIndex={0}
								gap={3}
								align="center"
								width="100%"
								className="min-w-0 cursor-pointer"
								onClick={() => onSelectAccount(acc.id)}
								onKeyDown={(e: React.KeyboardEvent) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectAccount(acc.id);
									}
								}}
							>
								<EntityThumb imageUrl={acc.imageUrl} name={acc.name} />
								<Stack gap={0.5} className="min-w-0 flex-1">
									<Text maxLines={1} className="text-[15px] font-semibold text-ink">
										{acc.name}
									</Text>
									<Text maxLines={1} className="text-[12px] text-slate">
										Treasury: ฿{formatMoney(treasury(acc))} (฿{formatMoney(eomTreasury(acc))})
									</Text>
								</Stack>
								<Badge variant="neutral" label={formatType(acc.type)} className="shrink-0" />
							</HStack>

							{/* Career sub-card decoupled from entity card click */}
							{hasCareer && (
								<PlainButton
									className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-signal/10 bg-signal/5 p-2.5 text-left active:bg-signal/10"
									onClick={(e: React.MouseEvent) => {
										e.stopPropagation();
										onOpenCareerEdit(acc);
									}}
								>
									{acc.careerImageUrl ? (
										<Img
											src={acc.careerImageUrl}
											alt={acc.careerTitle || acc.name}
											className="block size-11 shrink-0 rounded-[12px] object-cover"
										/>
									) : (
										<HStack
											justify="center"
											align="center"
											className="size-11 shrink-0 rounded-[12px] bg-signal/10 text-[13px] font-bold uppercase text-signal"
										>
											{(acc.careerTitle || acc.name).slice(0, 2)}
										</HStack>
									)}
									<Stack gap={0.5} className="min-w-0 flex-1">
										<HStack width="100%" justify="between" align="center" gap={2}>
											<Text className="text-[10px] font-bold uppercase tracking-[0.06em] text-signal">
												{t("home.currentCareer", lang)}
											</Text>
											{countdown && (
												<Text className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.04em] text-slate">
													{countdown}
												</Text>
											)}
										</HStack>
										<Text maxLines={1} className="text-[13px] font-bold text-ink">
											{acc.careerTitle || acc.name}
										</Text>
										{acc.careerCompany && (
											<Text maxLines={1} className="text-[12px] text-slate">
												{acc.careerCompany}
											</Text>
										)}
										{acc.salary ? (
											<Text className="text-[12px] font-bold text-[#059669]">+฿{formatMoney(acc.salary)}/mo</Text>
										) : null}
									</Stack>
								</PlainButton>
							)}
						</ListItemCard>
					);
				})}
			</Stack>
		</Stack>
	);
};
