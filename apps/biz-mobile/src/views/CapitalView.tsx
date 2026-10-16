import React, { useState } from "react";
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
import { AdjustCashModal } from "../components/AdjustCashModal";
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
	const [isAdjustCashOpen, setIsAdjustCashOpen] = useState(false);

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
	const entityRev = revenues.filter((r) => r.entityId === activeAccount.id && r.active);
	const entityLiab = liabilities.filter((l) => l.entityId === activeAccount.id && l.active);

	const hasSalaryStream = entityRev.some((r) => r.source === "salary");
	const legacySalary = !hasSalaryStream && activeAccount.type === "personal" ? (activeAccount.salary ?? 0) : 0;
	const totalIncome = round2(
		legacySalary +
		entityRev.reduce(
			(acc, r) => acc + (r.frequency === "yearly" ? round2(r.amount / 12) : r.frequency === "monthly" ? r.amount : 0),
			0,
		),
	);

	const totalMonthlyExpenses = round2(
		entitySubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0),
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

	// Capital transfers
	const incomingTransfers = transfers.filter((t) => t.toEntityId === activeAccount.id);
	const outgoingTransfers = transfers.filter((t) => t.fromEntityId === activeAccount.id);
	const relevantTransfers = isPersonal ? outgoingTransfers : incomingTransfers;
	const totalCapitalIn = round2(incomingTransfers.reduce((acc, t) => acc + t.amount, 0));
	const totalCapitalOut = round2(outgoingTransfers.reduce((acc, t) => acc + t.amount, 0));

	const subTabs: Array<{ id: CapitalSubTab; label: string }> = [
		{ id: "capital", label: t("subtab.capital", lang) },
		{ id: "income", label: t("subtab.income", lang) },
		{ id: "expense", label: t("subtab.expense", lang) },
		{ id: "assets", label: t("subtab.assets", lang) },
		{ id: "liability", label: t("subtab.liability", lang) },
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

						{/* Detail — Capital */}
						{activeCapitalSubTab === "capital" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
								<div className="section-header">
									<div>
										<span className="section-title">{t("subtab.capital", lang)}</span>
										<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
											{isPersonal
												? `Total Deployed to Ventures: ฿${formatMoney(totalCapitalOut)}`
												: `Total Capital In: ฿${formatMoney(totalCapitalIn)}`}
										</div>
									</div>
									<button
										type="button"
										className="action-pill-btn"
										style={{ padding: "4px 12px", fontSize: "12px" }}
										onClick={() => {
											setSelectedTransfer(null);
											setIsCapitalOpen(true);
										}}
									>
										{isPersonal ? t("action.moveCapital", lang) : t("action.injectCapital", lang)}
									</button>
								</div>

								{relevantTransfers.length === 0 ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										{isPersonal
											? 'No seed capital deployed to ventures yet. Tap "+ Move Capital" to allocate funds.'
											: "No capital transfers recorded for this business yet."}
									</div>
								) : (
									<div className="item-list">
										{relevantTransfers.map((tItem) => (
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
													<span className="item-name">{tItem.note || (isPersonal ? "Capital Deployed" : "Capital Inflow")}</span>
													<span className="item-sub">
														{isPersonal ? "Seed to business" : "Capital inflow"} • {tItem.date}
													</span>
												</div>
												<div className="item-amount-col">
													<span className={`item-amount ${isPersonal ? "negative" : "positive"}`}>
														{isPersonal ? `-฿${formatMoney(tItem.amount)}` : `+฿${formatMoney(tItem.amount)}`}
													</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
														CAPITAL
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}

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
									<button
										type="button"
										className="action-pill-btn"
										style={{ padding: "4px 12px", fontSize: "12px" }}
										onClick={() => {
											setSelectedRev(null);
											setIsRevenueOpen(true);
										}}
									>
										{t("action.addIncome", lang)}
									</button>
								</div>

								{entityRev.length === 0 && !legacySalary ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										No income streams registered for this entity.
									</div>
								) : (
									<div className="item-list">
										{legacySalary > 0 && !hasSalaryStream && (
											<div className="list-item-card">
												<div className="item-thumb-wrapper">
													<div className="item-thumb-fallback">SA</div>
												</div>
												<div className="item-info">
													<span className="item-name">Base Career Salary</span>
													<span className="item-sub">Fixed monthly payroll</span>
												</div>
												<div className="item-amount-col">
													<span className="item-amount positive">+฿{formatMoney(legacySalary)}</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
														SALARY
													</span>
												</div>
											</div>
										)}
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
											Recurring operational commitments & services
										</div>
									</div>
									<button
										type="button"
										className="action-pill-btn"
										style={{ padding: "4px 12px", fontSize: "12px" }}
										onClick={() => {
											setSelectedSub(null);
											setIsExpenseOpen(true);
										}}
									>
										{t("action.addExpense", lang)}
									</button>
								</div>

								{entitySubs.length === 0 ? (
									<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
										No recurring expenses registered for this entity.
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
										<div style={{ display: "flex", gap: "6px" }}>
											<button
												type="button"
												className="action-pill-btn"
												style={{ padding: "4px 12px", fontSize: "12px" }}
												onClick={() => setIsAdjustCashOpen(true)}
											>
												{t("action.adjustBalance", lang)}
											</button>
											<button
												type="button"
												className="action-pill-btn"
												style={{ padding: "4px 12px", fontSize: "12px" }}
												onClick={() => {
													setSelectedHw(null);
													setIsGearOpen(true);
												}}
											>
												+ Add Asset
											</button>
										</div>
									</div>

									{cashAssets.length === 0 ? (
										<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "16px" }}>
											No cash/reserve accounts tracked. Tap "Adjust Balance" to calibrate.
										</div>
									) : (
										<div className="item-list">
											{cashAssets.map((hw) => (
												<div
													key={hw.id}
													className="list-item-card"
													onClick={() => {
														setSelectedHw(hw);
														setIsGearOpen(true);
													}}
												>
													<div className="item-thumb-wrapper">
														<div className="item-thumb-fallback">฿</div>
													</div>
													<div className="item-info">
														<span className="item-name">{hw.name}</span>
														<span className="item-sub">Liquid Reserve (No Depreciation)</span>
													</div>
													<div className="item-amount-col">
														<span className="item-amount positive">฿{formatMoney(hw.cost)}</span>
														<span className="item-badge" style={{ backgroundColor: "rgba(10, 138, 77, 0.08)", color: "#0A8A4D" }}>
															CASH
														</span>
													</div>
												</div>
											))}
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
										className="action-pill-btn"
										style={{ padding: "4px 12px", fontSize: "12px" }}
										onClick={() => {
											setSelectedLiab(null);
											setIsLiabilityOpen(true);
										}}
									>
										{t("action.addLiability", lang)}
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
														<div className="item-thumb-fallback">
															{liab.name.slice(0, 2).toUpperCase()}
														</div>
													)}
												</div>
												<div className="item-info">
													<span className="item-name">{liab.name}</span>
													<span className="item-sub">
														{liab.category.replace(/_/g, " ")}{liab.notes ? ` • ${liab.notes}` : ""}
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
						{/* Back — Month Selection Archive */}
						<MonthStepper />

						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div className="section-header">
								<span className="section-title">Month Archive</span>
								<span style={{ fontSize: "12px", color: "var(--slate-gray)" }}>
									{monthActions.length} events
								</span>
							</div>

							{monthActions.length === 0 ? (
								<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
									No charges or transactions logged for this month.
								</div>
							) : (
								<div className="item-list">
									{monthActions.map((act) => {
										const isPositive = act.amount >= 0;
										const isDepreciation = act.type === "depreciation";

										const matchSub = subscriptions.find((sb) => sb.id === act.reference || sb.id === act.id);
										const matchHw = hardware.find((hw) => hw.id === act.reference || hw.id === act.id);
										const matchRev = revenues.find((rv) => rv.id === act.reference || rv.id === act.id);
										const matchLiab = liabilities.find((lb) => lb.id === act.reference || lb.id === act.id);
										const itemImage = matchSub?.imageUrl || matchHw?.imageUrl || matchRev?.imageUrl || matchLiab?.imageUrl;

										return (
											<div key={act.id} className="list-item-card">
												<div className="item-thumb-wrapper">
													{itemImage ? (
														<img src={itemImage} alt={act.title} className="item-thumb" />
													) : (
														<div className="item-thumb-fallback">
															{act.title.slice(0, 2).toUpperCase()}
														</div>
													)}
												</div>
												<div className="item-info">
													<span className="item-name">{act.title}</span>
													<span className="item-sub">
														{act.date} • {act.category || act.type.toUpperCase()}
													</span>
												</div>
												<div className="item-amount-col">
													<span
														className={`item-amount ${isPositive ? "positive" : isDepreciation ? "" : "negative"}`}
														style={{ color: isDepreciation ? "var(--slate-gray)" : undefined }}
													>
														{isPositive ? `+฿ ${formatMoney(act.amount)}` : `-฿ ${formatMoney(Math.abs(act.amount))}`}
													</span>
													{isDepreciation && (
														<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
															Non-Cash
														</span>
													)}
												</div>
											</div>
										);
									})}
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
			<AdjustCashModal isOpen={isAdjustCashOpen} onClose={() => setIsAdjustCashOpen(false)} />
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
