import React, { useState } from "react";
import type { EntityAccount } from "@excited-live/biz";
import { AddBusinessDrawer } from "../components/AddBusinessDrawer";
import { AddRevenueDrawer } from "../components/AddRevenueDrawer";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

const formatType = (t: string) => {
	switch (t) {
		case "personal":
			return "Personal";
		case "business":
			return "Business";
		default:
			return t;
	}
};

export const HomeView: React.FC = () => {
	const { accounts, setActiveEntityId, setActiveTab } = useBiz();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<EntityAccount | null>(null);
	const [isRevenueOpen, setIsRevenueOpen] = useState(false);

	const personal = accounts.find((a) => a.type === "personal");
	const needsCareer = personal ? !personal.salary : false;

	const totalTreasury = accounts.reduce((acc, a) => acc + a.cashReserve, 0);
	const personalCash = personal?.cashReserve ?? 0;
	const businessCash = accounts
		.filter((a) => a.type === "business")
		.reduce((acc, a) => acc + a.cashReserve, 0);

	return (
		<div className="home-page-layout">
			{/* Full-width Background Hero Illustration */}
			<div className="home-hero-bg-wrapper">
				<img
					src="/hero-banner.webp"
					alt="Solopreneur Venture Treasury"
					className="home-hero-bg-image"
				/>
				<div className="home-hero-bg-scrim" />
			</div>

			{/* Main App Section (Sheet) rising below background */}
			<div className="home-app-section">
				<div className="home-sheet-handle" />

				{/* Total Asset / Consolidated Treasury info */}
				<div className="home-treasury-panel">
					<div className="home-hero-eyebrow">
						<span className="hero-eyebrow-dot">•</span>
						<span>Consolidated Treasury</span>
					</div>
					<div className="home-hero-balance">
						<span className="home-hero-currency">฿</span>
						<span>{formatMoney(totalTreasury)}</span>
					</div>
					<div className="home-hero-meta-row">
						<div className="home-hero-chip">
							<span className="chip-label">Personal:</span>
							<span className="chip-value">฿{formatMoney(personalCash)}</span>
						</div>
						<div className="home-hero-chip">
							<span className="chip-label">Ventures:</span>
							<span className="chip-value">฿{formatMoney(businessCash)}</span>
						</div>
					</div>
				</div>

				{/* Entities Section */}
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					<div className="section-header">
						<span className="section-title">Entities</span>
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
							return (
								<div
									key={acc.id}
									className="list-item-card"
									onClick={() => {
										setActiveEntityId(acc.id);
										setActiveTab("capital");
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
										</div>
										<span className="item-sub">
											{formatType(acc.type)}
											{acc.salary ? ` • Career +฿${formatMoney(acc.salary)}/mo` : ""} • Treasury: ฿
											{formatMoney(acc.cashReserve)}
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

				{/* Onboarding — add career income when missing */}
				{needsCareer && (
					<div className="card">
						<div className="section-title">Add Career Income</div>
						<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
							Track your salary as personal income so your run rate and runway projection are accurate.
						</div>
						<button
							type="button"
							className="action-pill-btn"
							style={{ alignSelf: "flex-start" }}
							onClick={() => {
								setActiveEntityId("acc_personal");
								setIsRevenueOpen(true);
							}}
						>
							Add Career
						</button>
					</div>
				)}
			</div>

			{/* Drawers */}
			<AddBusinessDrawer
				isOpen={isDrawerOpen}
				onClose={() => {
					setIsDrawerOpen(false);
					setSelectedBiz(null);
				}}
				initialData={selectedBiz}
			/>
			<AddRevenueDrawer isOpen={isRevenueOpen} onClose={() => setIsRevenueOpen(false)} />
		</div>
	);
};
