import React from "react";
import {
	HomeIcon,
	SettingsIcon,
	WalletIcon,
	type IconProps,
} from "@excited-live/design-system";
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
		<div className="bottom-dock-wrapper">
			<nav className="bottom-dock" aria-label="Main Navigation">
				{tabs.map(({ id, label, Icon }) => {
					const isActive = activeTab === id;
					return (
						<button
							key={id}
							type="button"
							className={`dock-tab-btn ${isActive ? "active" : ""}`}
							onClick={() => setActiveTab(id)}
							aria-label={label}
							aria-current={isActive ? "page" : undefined}
							title={label}
						>
							<Icon className="dock-tab-icon" aria-hidden="true" />
						</button>
					);
				})}
			</nav>
		</div>
	);
};
