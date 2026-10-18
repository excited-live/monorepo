import React from "react";
import {
	HomeIcon,
	PlainButton,
	SettingsIcon,
	WalletIcon,
	type IconProps,
} from "@excited-live/design-system";
import { HStack } from "@astryxdesign/core/HStack";
import { useBiz } from "../../state";
import { t } from "../../utils/i18n";

export const BottomDock: React.FC = () => {
	const { activeTab, setActiveTab, accounts, activeEntityId, lang } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0];
	const isPersonal = activeAccount?.type === "personal";

	const detailLabel = isPersonal ? t("tab.personalDetail", lang) : t("tab.businessDetail", lang);

	const tabs: Array<{
		id: "home" | "capital" | "settings";
		label: string;
		Icon: React.ComponentType<IconProps>;
	}> = [
		{ id: "home", label: t("tab.home", lang), Icon: HomeIcon },
		{ id: "capital", label: detailLabel, Icon: WalletIcon },
		{ id: "settings", label: t("tab.settings", lang), Icon: SettingsIcon },
	];

	return (
		<HStack
			justify="center"
			className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[100] px-4"
		>
			<HStack
				as="nav"
				aria-label="Main Navigation"
				gap={1}
				className="pointer-events-auto w-full max-w-[420px] rounded-pill border border-white/65 bg-lifted/75 p-[5px] shadow-[0_12px_36px_rgba(20,20,19,0.12),0_2px_8px_rgba(20,20,19,0.06)] backdrop-blur-[24px] backdrop-saturate-[190%]"
			>
				{tabs.map(({ id, label, Icon }) => {
					const isActive = activeTab === id;
					return (
						<PlainButton
							key={id}
							className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-pill transition-all duration-200 [-webkit-tap-highlight-color:transparent] active:scale-[0.92] ${
								isActive ? "bg-ink/95 text-cream shadow-[0_2px_8px_rgba(20,20,19,0.18)]" : "text-ink"
							}`}
							onClick={() => setActiveTab(id)}
							aria-label={label}
							aria-current={isActive ? "page" : undefined}
							title={label}
						>
							<Icon className="block size-[22px]" aria-hidden="true" />
						</PlainButton>
					);
				})}
			</HStack>
		</HStack>
	);
};
