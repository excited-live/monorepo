import React, { useState } from "react";
import type { EntityAccount } from "@excited-live/biz";
import { AddBusinessDrawer } from "../components/AddBusinessDrawer";
import { HeroCard } from "../components/HeroCard";
import { HeroCarousel } from "../components/HeroCarousel";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

const formatType = (t: string) => {
	switch (t) {
		case "personal":
			return "Personal";
		case "fulltime_job":
			return "Fulltime Job";
		case "business":
			return "Venture / Business";
		default:
			return t;
	}
};

export const HomeView: React.FC = () => {
	const { accounts } = useBiz();

	const [browseId, setBrowseId] = useState(accounts[0]?.id ?? "");
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<EntityAccount | null>(null);

	return (
		<div className="screen-content">
			{/* 1. Hero — Org Register (all entities, swipeable) */}
			<HeroCarousel
				accounts={accounts}
				activeEntityId={browseId}
				onSelectEntity={setBrowseId}
				renderCard={(account) => <HeroCard account={account} />}
			/>

			{/* 2. Registered Legal Entities */}
			<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
				<div className="section-header">
					<span className="section-title">Registered Legal Entities</span>
					<button
						type="button"
						className="action-pill-btn"
						style={{ padding: "4px 12px", fontSize: "12px" }}
						onClick={() => {
							setSelectedBiz(null);
							setIsDrawerOpen(true);
						}}
					>
						+ Add Business
					</button>
				</div>

				<div className="item-list">
					{accounts.map((acc) => {
						const isBusiness = acc.type === "business";
						return (
							<div
								key={acc.id}
								className="list-item-card"
								style={{ cursor: isBusiness ? "pointer" : "default" }}
								onClick={() => {
									if (isBusiness) {
										setSelectedBiz(acc);
										setIsDrawerOpen(true);
									}
								}}
							>
								<div className="item-thumb-wrapper">
									{acc.imageUrl ? (
										<img src={acc.imageUrl} alt={acc.name} className="item-thumb" />
									) : (
										<div className="item-thumb-fallback">
											{acc.name.slice(0, 2).toUpperCase()}
										</div>
									)}
								</div>
								<div className="item-info">
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<span className="item-name">{acc.name}</span>
										{isBusiness && (
											<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
												Tap to Edit
											</span>
										)}
									</div>
									<span className="item-sub">
										{formatType(acc.type)} • {acc.type === "fulltime_job" ? `฿${formatMoney(acc.salary || 0)}/mo` : `Treasury: ฿${formatMoney(acc.cashReserve)}`}
									</span>
								</div>
								<div className="item-amount-col">
									<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.06)", color: "var(--granite)" }}>
										{formatType(acc.type)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Business Drawer for Add/Edit */}
			<AddBusinessDrawer
				isOpen={isDrawerOpen}
				onClose={() => {
					setIsDrawerOpen(false);
					setSelectedBiz(null);
				}}
				initialData={selectedBiz}
			/>
		</div>
	);
};
