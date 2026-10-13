import React from "react";
import {
	HomeIcon,

	SettingsIcon,
	WalletIcon,
	type IconProps,
} from "@excited-live/design-system";
import { useBiz } from "../state";

const TABS: Array<{
	id: "home" | "capital" | "settings";
	label: string;
	Icon: React.ComponentType<IconProps>;
}> = [
	{ id: "home", label: "Home", Icon: HomeIcon },
	{ id: "capital", label: "Business Detail", Icon: WalletIcon },
	{ id: "settings", label: "Settings", Icon: SettingsIcon },
];

export const BottomDock: React.FC = () => {
	const { activeTab, setActiveTab } = useBiz();

	return (
		<div className="bottom-dock-wrapper">
			<nav className="bottom-dock" aria-label="Main Navigation">
				{TABS.map(({ id, label, Icon }) => {
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
