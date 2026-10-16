import React, { useState } from "react";
import { calculateDerivedTreasury, type EntityAccount, type RevenueStream } from "@excited-live/biz";
import { AddBusinessDrawer } from "../components/AddBusinessDrawer";
import { AddRevenueDrawer } from "../components/AddRevenueDrawer";
import {
	calculateConsolidatedWealth,
	calculatePaydayCountdown,
} from "../domain/selectors";
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
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		setActiveEntityId,
		setActiveTab,
	} = useBiz();

	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [selectedBiz, setSelectedBiz] = useState<EntityAccount | null>(null);
	const [isRevenueOpen, setIsRevenueOpen] = useState(false);
	const [careerStream, setCareerStream] = useState<RevenueStream | null>(null);

	const personal = accounts.find((a) => a.type === "personal");
	const needsCareer = personal ? !personal.salary : false;

	const { totalTreasury, totalEomTreasury, personalCash, businessCash } =
		calculateConsolidatedWealth({
			accounts,
			hardware,
			subscriptions,
			revenues,
			liabilities,
			transfers,
		});

	/** End-of-month treasury for a single account */
	const eomTreasury = (acc: EntityAccount) =>
		calculateDerivedTreasury({
			account: acc,
			subscriptions,
			revenues,
			liabilities,
			hardware,
			transfers,
		});

	const openCareerEdit = (acc: EntityAccount) => {
		setActiveEntityId(acc.id);
		setCareerStream(
			revenues.find((r) => r.entityId === acc.id && r.source === "salary" && r.active) ?? null,
		);
		setIsRevenueOpen(true);
	};

	return (
		<div className="home-page-layout">
			{/* Full-width Background Hero Illustration */}
			<div className="home-hero-bg-wrapper">
				<img
					src="/hero-banner.webp"
					alt="Solopreneur Business Treasury"
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
						<span>Consolidated Wealth</span>
					</div>
					<div className="home-hero-balance">
						<span className="home-hero-currency">฿</span>
						<span>{formatMoney(totalTreasury)}</span>
						<span className="home-hero-eom">
							(end of month ฿{formatMoney(totalEomTreasury)})
						</span>
					</div>
					<div className="home-hero-meta-row">
						<div className="home-hero-chip">
							<span className="chip-label">Personal:</span>
							<span className="chip-value">฿{formatMoney(personalCash)}</span>
						</div>
						<div className="home-hero-chip">
							<span className="chip-label">Businesses:</span>
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
							const hasCareer =
								acc.type === "personal" && Boolean(acc.careerTitle || acc.careerCompany || acc.salary);
							const countdown = calculatePaydayCountdown(acc.paydayDayOfMonth);
							return (
								<div
									key={acc.id}
									className={`list-item-card ${hasCareer ? "has-subcard" : ""}`}
									onClick={() => {
										setActiveEntityId(acc.id);
										setActiveTab("capital");
									}}
								>
									<div className="entity-card-main">
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
											<span className="item-name">{acc.name}</span>
											<span className="item-sub">
												Treasury: ฿{formatMoney(acc.cashReserve)} (฿{formatMoney(eomTreasury(acc))})
											</span>
										</div>
										<div className="item-amount-col">
											<span
												className="item-badge"
												style={{
													backgroundColor: "rgba(20, 20, 19, 0.06)",
													color: "var(--granite)",
												}}
											>
												{formatType(acc.type)}
											</span>
										</div>
									</div>

									{/* Career sub-card */}
									{hasCareer && (
										<button
											type="button"
											className="career-subcard"
											onClick={(e) => {
												e.stopPropagation();
												openCareerEdit(acc);
											}}
										>
											{acc.careerImageUrl ? (
												<img
													src={acc.careerImageUrl}
													alt={acc.careerTitle || acc.name}
													className="career-subcard-image"
												/>
											) : (
												<div className="career-subcard-image career-subcard-image-fallback">
													{(acc.careerTitle || acc.name).slice(0, 2).toUpperCase()}
												</div>
											)}
											<div className="career-subcard-info">
												<div className="career-subcard-head">
													<span className="career-subcard-eyebrow">Current Career</span>
													{countdown && (
														<span className="career-subcard-payday">{countdown}</span>
													)}
												</div>
												<span className="career-subcard-title">
													{acc.careerTitle || acc.name}
												</span>
												{acc.careerCompany && (
													<span className="career-subcard-company">{acc.careerCompany}</span>
												)}
												{acc.salary ? (
													<span className="career-subcard-income">
														+฿{formatMoney(acc.salary)}/mo
													</span>
												) : null}
											</div>
										</button>
									)}
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
								setCareerStream(null);
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
			<AddRevenueDrawer
				isOpen={isRevenueOpen}
				onClose={() => {
					setIsRevenueOpen(false);
					setCareerStream(null);
				}}
				initialData={careerStream}
			/>
		</div>
	);
};
