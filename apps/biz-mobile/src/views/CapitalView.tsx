import React, { useState, useEffect } from "react";
import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	generateMonthlyLedger,
	type CapitalTransfer,
	type EntityAccount,
	type HardwareAsset,
	isCashAsset,
	type LiabilityStream,
	type RecurringSubscription,
	type RevenueStream,
	round2,
} from "@excited-live/biz";
import { AddBusinessDrawer } from "../components/AddBusinessDrawer";
import { AddExpenseDrawer } from "../components/AddExpenseDrawer";
import { AddGearDrawer } from "../components/AddGearDrawer";
import { AddLiabilityDrawer } from "../components/AddLiabilityDrawer";
import { AddRevenueDrawer } from "../components/AddRevenueDrawer";
import { CapitalDrawer } from "../components/CapitalDrawer";
import { CapitalHeroCard } from "../components/CapitalHeroCard";
import { HeroCarousel } from "../components/HeroCarousel";
import { LedgerHeroCard } from "../components/LedgerHeroCard";
import { MonthStepper } from "../components/MonthStepper";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";
import { t } from "../utils/i18n";
import type { CapitalSubTab } from "../domain/types";

export const CapitalView: React.FC = () => {
	const {
		accounts,
		subscriptions,
		hardware,
		revenues,
		liabilities,
		transfers,
		activeEntityId,
		setActiveEntityId,
		setActiveTab,
		activeCapitalSubTab,
		setActiveCapitalSubTab,
		selectedMonth,
		userSession,
		lang,
	} = useBiz();

	const [flipped, setFlipped] = useState(false);
	const [isCapitalOpen, setIsCapitalOpen] = useState(false);
	const [selectedTransfer, setSelectedTransfer] = useState<CapitalTransfer | null>(null);

	const [isExpenseOpen, setIsExpenseOpen] = useState(false);
	const [selectedSub, setSelectedSub] = useState<RecurringSubscription | null>(null);

	const [isGearOpen, setIsGearOpen] = useState(false);
	const [selectedHw, setSelectedHw] = useState<HardwareAsset | null>(null);

	const [isRevenueOpen, setIsRevenueOpen] = useState(false);
	const [selectedRev, setSelectedRev] = useState<RevenueStream | null>(null);

	const [isLiabilityOpen, setIsLiabilityOpen] = useState(false);
	const [selectedLiab, setSelectedLiab] = useState<LiabilityStream | null>(null);

	const [isEditBizOpen, setIsEditBizOpen] = useState(false);
	const [editBiz, setEditBiz] = useState<EntityAccount | null>(null);

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	// Capital sub-tab removed in favor of hero derivation; fallback to income if previously set
	useEffect(() => {
		if (activeCapitalSubTab === "capital") {
			setActiveCapitalSubTab("income");
		}
	}, [activeCapitalSubTab, setActiveCapitalSubTab]);

	const monthActions = generateMonthlyLedger({
		account: activeAccount,
		yearMonth: selectedMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
		liabilities,
	}).actions;

	// Run-rate inputs for the active entity
	const entitySubs = subscriptions.filter((s) => s.entityId === activeAccount.id && s.active);
	const entityHw = hardware.filter((h) => h.entityId === activeAccount.id);
	const cashAssets = entityHw.filter((h) => isCashAsset(h));
	const gearAssets = entityHw.filter((h) => !isCashAsset(h));
	const entityRev = revenues.filter((r) => {
		if (r.entityId !== activeAccount.id || !r.active) return false;
		if (selectedMonth) {
			if (r.frequency === "one_time") return r.startMonth === selectedMonth;
			if (r.startMonth && selectedMonth < r.startMonth) return false;
			if (r.endMonth && selectedMonth > r.endMonth) return false;
		}
		return true;
	});
	const entityLiab = liabilities.filter((l) => l.entityId === activeAccount.id && l.active);

	const hasConfiguredSalary = revenues.some(
		(r) => r.entityId === activeAccount.id && r.source === "salary",
	);
	const legacySalary = !hasConfiguredSalary && activeAccount.type === "personal" ? (activeAccount.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
			entityRev.reduce(
				(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.frequency === "monthly" ? r.amount : 0),
				0,
			),
	);

	// Capital transfers
	const incomingTransfers = transfers.filter((t) => t.toEntityId === activeAccount.id);
	const outgoingTransfers = transfers.filter((t) => t.fromEntityId === activeAccount.id);

	// In personal account, seed capital deployed to ventures is treated as an operational expense
	const personalCapitalBurn = isPersonal
		? outgoingTransfers
				.filter((t) => t.date.startsWith(selectedMonth))
				.reduce((acc, t) => acc + t.amount, 0)
		: 0;

	const totalMonthlyExpenses = round2(
		entitySubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
			personalCapitalBurn,
	);

	const totalMonthlyLiabilities = round2(
		entityLiab.reduce((acc, l) => acc + l.amount, 0),
	);

	const totalBookValue = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).remainingBookValue,
			0,
		),
	);

	const totalLiquidReserves = round2(
		cashAssets.reduce((acc, h) => acc + h.cost, 0),
	);

	const totalDepreciation = round2(
		gearAssets.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, selectedMonth).monthlyRate,
			0,
		),
	);

	const subTabs: Array<{ id: CapitalSubTab; label: string }> = [
		{ id: "income" as CapitalSubTab, label: t("subtab.income", lang) },
		{ id: "expense" as CapitalSubTab, label: t("subtab.expense", lang) },
		{ id: "assets" as CapitalSubTab, label: t("subtab.assets", lang) },
		{ id: "liability" as CapitalSubTab, label: t("subtab.liability", lang) },
	];

	return (
		<div className="capital-page-layout">
			{/* Full-width background image */}
			{(() => {
				const bgImg = activeAccount.type === "personal"
					? (activeAccount.careerImageUrl || activeAccount.imageUrl || userSession.avatarUrl)
					: activeAccount.imageUrl;
				if (!bgImg) return null;
				return (
					<div className="capital-hero-bg-wrapper">
						<img
							src={bgImg}
							alt={activeAccount.name}
							className="capital-hero-bg-image"
						/>
						<div className="capital-hero-bg-scrim" />
					</div>
				);
			})()}

			{/* Floating Hero Card: upper 80% over org background, lower 20% over app sheet */}
			<div className="capital-hero-card-container">
				<div className={`hero-flip ${flipped ? "flipped" : ""}`}>
					<div className="hero-flip-inner">
						<div className="hero-flip-face front">
							<HeroCarousel
								accounts={accounts}
								activeEntityId={activeEntityId}
								onSelectEntity={setActiveEntityId}
								onTap={() => setFlipped(true)}
								renderCard={(account) => (
									<CapitalHeroCard
										account={account}
										onConfigure={() => {
											if (account.type === "business") {
												setEditBiz(account);
												setIsEditBizOpen(true);
											}
										}}
										onPersonalSettings={() => setActiveTab("settings")}
										onTap={() => setFlipped(true)}
									/>
								)}
							/>
						</div>

						<div className="hero-flip-face back">
							<HeroCarousel
								accounts={accounts}
								activeEntityId={activeEntityId}
								onSelectEntity={setActiveEntityId}
								onTap={() => setFlipped(false)}
								renderCard={(account) => (
									<LedgerHeroCard
										account={account}
										yearMonth={selectedMonth}
										onTap={() => setFlipped(false)}
									/>
								)}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Main App Section (Sheet) */}
			<div className="capital-app-sheet">
				{/* Global Month Navigator accessible in all subtabs and views */}
				<MonthStepper />

				{!flipped ? (
					<>
						{/* Detail Mode Switcher */}
						<div className="sub-tab-switcher">
							{subTabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									className={`sub-tab-btn ${activeCapitalSubTab === tab.id ? "active" : ""}`}
									onClick={() => setActiveCapitalSubTab(tab.id)}
								>
									{tab.label}
								</button>
							))}
						</div>


						{/* Detail — Income */}
						{activeCapitalSubTab === "income" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								<div className="section-header">
									<div>
										<span className="section-title">
											{isPersonal ? `Monthly Income: ฿${formatMoney(totalIncome)}/mo` : `Total MRR: ฿${formatMoney(totalIncome)}/mo`}
										</span>
										<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
											{isPersonal ? "Base salary and operational income" : "Monthly recurring revenues and subscriptions"}
										</div>
									</div>
									<div style={{ display: "flex", gap: "8px" }}>
										{!isPersonal && (
											<button
												type="button"
												className="action-pill-btn"
												style={{ padding: "4px 12px", fontSize: "12px" }}
												onClick={() => {
													setSelectedTransfer(null);
													setIsCapitalOpen(true);
												}}
											>
												{t("action.injectCapital", lang)}
											</button>
										)}
										<button
											type="button"
											className="action-pill-btn primary"
											style={{ padding: "4px 12px", fontSize: "12px" }}
											onClick={() => {
												setSelectedRev(null);
												setIsRevenueOpen(true);
											}}
										>
											{t("action.addIncome", lang)}
										</button>
									</div>
								</div>

								{/* Base Salary Card (Personal Mode only, if set) */}
								{isPersonal && activeAccount.salary && !hasConfiguredSalary && (
									<div className="list-item-card">
										<div className="item-thumb-wrapper">
											<div className="item-thumb-fallback">💼</div>
										</div>
										<div className="item-info">
											<span className="item-name">Primary Career Income</span>
											<span className="item-sub">
												Payday Day {activeAccount.paydayDayOfMonth ?? 28} • Net Monthly
											</span>
										</div>
										<div className="item-amount-col">
											<span className="item-amount positive">
												+฿{formatMoney(activeAccount.salary)}
											</span>
											<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
												SALARY
											</span>
										</div>
									</div>
								)}

								{entityRev.length === 0 && (!isPersonal || !activeAccount.salary) ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										No income streams registered for this entity.
									</div>
								) : (
									<div className="item-list">
										{entityRev.map((rev) => (
											<div
												key={rev.id}
												className="list-item-card"
												onClick={() => {
													setSelectedRev(rev);
													setIsRevenueOpen(true);
												}}
											>
												<div className="item-thumb-wrapper">
													{rev.imageUrl ? (
														<img src={rev.imageUrl} alt={rev.name} className="item-thumb" />
													) : (
														<div className="item-thumb-fallback">
															{rev.name.slice(0, 2).toUpperCase()}
														</div>
													)}
												</div>
												<div className="item-info">
													<span className="item-name">{rev.name}</span>
													<span className="item-sub">
														{rev.source.replace(/_/g, " ")} • {rev.frequency}
													</span>
												</div>
												<div className="item-amount-col">
													<span className="item-amount positive">
														+฿{formatMoney(rev.amount)}
													</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
														{rev.source === "salary" ? "SALARY" : "MONTHLY"}
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}

						{/* Detail — Expenses */}
						{activeCapitalSubTab === "expense" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								<div className="section-header">
									<div>
										<span className="section-title">
											Monthly Burn: ฿{formatMoney(totalMonthlyExpenses)}/mo
										</span>
										<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
											{isPersonal
												? "Recurring expenses & capital deployed to businesses"
												: "Recurring operational commitments & services"}
										</div>
									</div>
									<div style={{ display: "flex", gap: "6px" }}>
										<button
											type="button"
											className="action-pill-btn primary"
											style={{ padding: "4px 12px", fontSize: "12px" }}
											onClick={() => {
												setSelectedSub(null);
												setIsExpenseOpen(true);
											}}
										>
											{t("action.addExpense", lang)}
										</button>
									</div>
								</div>

								{entitySubs.length === 0 && (!isPersonal || outgoingTransfers.length === 0) ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										No expenses registered for this entity.
									</div>
								) : (
									<div className="item-list">
										{entitySubs.map((sub) => (
											<div
												key={sub.id}
												className="list-item-card"
												onClick={() => {
													setSelectedSub(sub);
													setIsExpenseOpen(true);
												}}
											>
												<div className="item-thumb-wrapper">
													{sub.imageUrl ? (
														<img src={sub.imageUrl} alt={sub.name} className="item-thumb" />
													) : (
														<div className="item-thumb-fallback">
															{sub.name.slice(0, 2).toUpperCase()}
														</div>
													)}
												</div>
												<div className="item-info">
													<span className="item-name">{sub.name}</span>
													<span className="item-sub">
														Billed {sub.cycle} • Due day {sub.nextRenewalDate?.slice(8) || "01"} • {sub.category}
													</span>
												</div>
												<div className="item-amount-col">
													<span className="item-amount negative">
														-฿{formatMoney(sub.amount)}
													</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
														{sub.cycle.toUpperCase()}
													</span>
												</div>
											</div>
										))}

										{/* Outgoing Capital Transfers (treated as expenses for personal) */}
										{isPersonal &&
											outgoingTransfers.map((tItem) => (
												<div
													key={tItem.id}
													className="list-item-card"
													style={{ cursor: "pointer" }}
													onClick={() => {
														setSelectedTransfer(tItem);
														setIsCapitalOpen(true);
													}}
												>
													<div className="item-thumb-wrapper">
														<div className="item-thumb-fallback">CI</div>
													</div>
													<div className="item-info">
														<span className="item-name">{tItem.note || "Capital Deployed"}</span>
														<span className="item-sub">
															Seed to business • {tItem.date}
														</span>
													</div>
													<div className="item-amount-col">
														<span className="item-amount negative">
															-฿{formatMoney(tItem.amount)}
														</span>
														<span
															className="item-badge"
															style={{
																backgroundColor: "rgba(207, 69, 0, 0.08)",
																color: "var(--signal-orange)",
															}}
														>
															CAPITAL
														</span>
													</div>
												</div>
											))}
									</div>
								)}
							</div>
						)}

						{/* Detail — Assets */}
						{activeCapitalSubTab === "assets" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
								{/* Liquid Cash Section */}
								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									<div className="section-header">
										<div>
											<span className="section-title">{t("section.liquidReserves", lang)}</span>
											<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
												Total Cash: ฿{formatMoney(totalLiquidReserves)} (Held at 100% value)
											</div>
										</div>
										<button
											type="button"
											className="action-pill-btn primary"
											style={{ padding: "4px 12px", fontSize: "12px" }}
											onClick={() => {
												setSelectedHw(null);
												setIsGearOpen(true);
											}}
										>
											+ Add Asset
										</button>
									</div>

									{cashAssets.length === 0 ? (
										<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "16px" }}>
											No cash/reserve accounts tracked. Tap "+ Add Asset" to add cash reserves.
										</div>
									) : (
										<div className="item-list">
											{cashAssets.map((hw) => {
												const assetInjections = incomingTransfers
													.filter((t) => t.targetAssetId === hw.id)
													.reduce((sum, t) => sum + t.amount, 0);
												const displayedCashCost = hw.cost + assetInjections;
												return (
													<div
														key={hw.id}
														className="list-item-card"
														onClick={() => {
															setSelectedHw(hw);
															setIsGearOpen(true);
														}}
													>
														<div className="item-thumb-wrapper">
															{hw.imageUrl ? (
																<img src={hw.imageUrl} alt={hw.name} className="item-thumb" />
															) : (
																<div className="item-thumb-fallback">฿</div>
															)}
														</div>
														<div className="item-info">
															<span className="item-name">{hw.name}</span>
															<span className="item-sub">
																Liquid Reserve {assetInjections > 0 ? `• Injected: ฿${formatMoney(assetInjections)}` : "(No Depreciation)"}
															</span>
														</div>
														<div className="item-amount-col">
															<span className="item-amount positive">฿{formatMoney(displayedCashCost)}</span>
															<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
																CASH
															</span>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>

								{/* Physical Hardware Section */}
								<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
									<div className="section-header">
										<div>
											<span className="section-title">Physical Hardware & Equipment</span>
											<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
												Book Value: ฿{formatMoney(totalBookValue)} • Dep: -฿{formatMoney(totalDepreciation)}/mo
											</div>
										</div>
									</div>

									{gearAssets.length === 0 ? (
										<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
											No depreciating hardware assets recorded for this entity.
										</div>
									) : (
										<div className="item-list">
											{gearAssets.map((hw) => {
												const dep = calculateAssetDepreciation(hw, selectedMonth);
												const pctRemaining = hw.cost > 0 ? (dep.remainingBookValue / hw.cost) * 100 : 0;

												return (
													<div
														key={hw.id}
														className="list-item-card"
														onClick={() => {
															setSelectedHw(hw);
															setIsGearOpen(true);
														}}
													>
														<div className="item-thumb-wrapper">
															{hw.imageUrl ? (
																<img src={hw.imageUrl} alt={hw.name} className="item-thumb" />
															) : (
																<div className="item-thumb-fallback">
																	{hw.name.slice(0, 2).toUpperCase()}
																</div>
															)}
														</div>
														<div className="item-info">
															<span className="item-name">{hw.name}</span>
															<span className="item-sub">
																Bought {hw.purchaseDate} • Cost: ฿{formatMoney(hw.cost)}
															</span>
															<div className="dep-progress-bar">
																<div className="dep-progress-fill" style={{ width: `${pctRemaining}%` }} />
															</div>
															<span style={{ fontSize: "11px", color: "var(--slate-gray)" }}>
																{dep.monthsRemaining} mos remaining • Depreciates -฿{formatMoney(dep.monthlyRate)}/mo
															</span>
														</div>
														<div className="item-amount-col">
															<span className="item-amount">฿{formatMoney(dep.remainingBookValue)}</span>
															<span style={{ fontSize: "11px", color: "var(--slate-gray)" }}>
																Book Value
															</span>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							</div>
						)}

						{/* Detail — Liabilities */}
						{activeCapitalSubTab === "liability" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								<div className="section-header">
									<div>
										<span className="section-title">Liabilities & Debt Payments</span>
										<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
											Total Monthly Payments: ฿{formatMoney(totalMonthlyLiabilities)}/mo
										</div>
									</div>
									<button
										type="button"
										className="action-pill-btn primary"
										style={{ padding: "4px 12px", fontSize: "12px" }}
										onClick={() => {
											setSelectedLiab(null);
											setIsLiabilityOpen(true);
										}}
									>
										{t("action.registerLiability", lang)}
									</button>
								</div>

								{entityLiab.length === 0 ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										No liabilities registered for this entity.
									</div>
								) : (
									<div className="item-list">
										{entityLiab.map((liab) => (
											<div
												key={liab.id}
												className="list-item-card"
												onClick={() => {
													setSelectedLiab(liab);
													setIsLiabilityOpen(true);
												}}
											>
												<div className="item-thumb-wrapper">
													{liab.imageUrl ? (
														<img src={liab.imageUrl} alt={liab.name} className="item-thumb" />
													) : (
														<div className="item-thumb-fallback">💳</div>
													)}
												</div>
												<div className="item-info">
													<span className="item-name">{liab.name}</span>
													<span className="item-sub">
														Debt Payment • {liab.category.replace(/_/g, " ")}
													</span>
												</div>
												<div className="item-amount-col">
													<span className="item-amount negative">
														-฿{formatMoney(liab.amount)}
													</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
														DEBT
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</>
				) : (
					<>
						{/* Month Action Items */}
						<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
							<div className="section-title">
								{t("ledger.actions", lang, {
									count: monthActions.length,
									month: selectedMonth,
								})}
							</div>

							{monthActions.length === 0 ? (
								<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
									{t("ledger.empty", lang)}
								</div>
							) : (
								<div className="item-list">
									{monthActions.map((action) => (
										<div key={action.id} className="list-item-card" style={{ cursor: "default" }}>
											<div className="item-thumb-wrapper">
												<div className="item-thumb-fallback">
													{action.type === "inflow"
														? "↓"
														: action.type === "outflow"
															? "↑"
															: "⚡"}
												</div>
											</div>
											<div className="item-info">
												<span className="item-name">{action.title}</span>
												<span className="item-sub">
													{action.date} • {action.category ? action.category.replace(/_/g, " ") : action.type}
												</span>
											</div>
											<div className="item-amount-col">
												<span
													className={`item-amount ${
														action.amount > 0 ? "positive" : "negative"
													}`}
												>
													{action.amount > 0 ? "+" : ""}฿
													{formatMoney(Math.abs(action.amount))}
												</span>
												<span
													className="item-badge"
													style={{
														backgroundColor:
															action.type === "inflow"
																? "rgba(10, 138, 77, 0.08)"
																: "rgba(207, 69, 0, 0.08)",
														color:
															action.type === "inflow"
																? "#0A8A4D"
																: "var(--signal-orange)",
													}}
												>
													{action.type.toUpperCase()}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Drawers & Modals */}
			<CapitalDrawer
				isOpen={isCapitalOpen}
				onClose={() => {
					setIsCapitalOpen(false);
					setSelectedTransfer(null);
				}}
				initialData={selectedTransfer}
			/>
			<AddBusinessDrawer
				isOpen={isEditBizOpen}
				onClose={() => {
					setIsEditBizOpen(false);
					setEditBiz(null);
				}}
				initialData={editBiz}
			/>
			<AddExpenseDrawer
				isOpen={isExpenseOpen}
				onClose={() => {
					setIsExpenseOpen(false);
					setSelectedSub(null);
				}}
				initialData={selectedSub}
			/>
			<AddGearDrawer
				isOpen={isGearOpen}
				onClose={() => {
					setIsGearOpen(false);
					setSelectedHw(null);
				}}
				initialData={selectedHw}
			/>
			<AddRevenueDrawer
				isOpen={isRevenueOpen}
				onClose={() => {
					setIsRevenueOpen(false);
					setSelectedRev(null);
				}}
				initialData={selectedRev}
			/>
			<AddLiabilityDrawer
				isOpen={isLiabilityOpen}
				onClose={() => {
					setIsLiabilityOpen(false);
					setSelectedLiab(null);
				}}
				initialData={selectedLiab}
			/>
		</div>
	);
};
