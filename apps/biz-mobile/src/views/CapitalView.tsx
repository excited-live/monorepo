import React, { useState } from "react";
import {
	calculateAssetDepreciation,
	calculateMonthlyEquivalent,
	generateMonthlyLedger,
	type EntityAccount,
	type HardwareAsset,
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
	} = useBiz();

	const [flipped, setFlipped] = useState(false);
	const [isCapitalOpen, setIsCapitalOpen] = useState(false);
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

	const monthActions = generateMonthlyLedger({
		account: activeAccount,
		yearMonth: selectedMonth,
		subscriptions,
		hardware,
		revenues,
		transfers,
	}).actions;

	// Run-rate inputs for the active entity
	const entitySubs = subscriptions.filter((s) => s.entityId === activeAccount.id && s.active);
	const entityHw = hardware.filter((h) => h.entityId === activeAccount.id);
	const entityRev = revenues.filter((r) => r.entityId === activeAccount.id && r.active);
	const entityLiab = liabilities.filter((l) => l.entityId === activeAccount.id && l.active);

	const totalMrr = round2(
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
		entityHw.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").remainingBookValue,
			0,
		),
	);

	const totalDepreciation = round2(
		entityHw.reduce(
			(acc, h) => acc + calculateAssetDepreciation(h, "2026-10").monthlyRate,
			0,
		),
	);

	const subTabLabel =
		activeCapitalSubTab === "income"
			? "Add Income"
			: activeCapitalSubTab === "expense"
				? "Add Expense"
				: activeCapitalSubTab === "assets"
					? "Add Asset"
					: "Add Liability";

	const openActiveAdd = () => {
		if (activeCapitalSubTab === "income") {
			setSelectedRev(null);
			setIsRevenueOpen(true);
		} else if (activeCapitalSubTab === "expense") {
			setSelectedSub(null);
			setIsExpenseOpen(true);
		} else if (activeCapitalSubTab === "assets") {
			setSelectedHw(null);
			setIsGearOpen(true);
		} else {
			setSelectedLiab(null);
			setIsLiabilityOpen(true);
		}
	};

	return (
		<div className="screen-content">
			{/* Flippable hero: front = business detail · back = runway projection */}
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
							renderCard={(account) => <LedgerHeroCard account={account} yearMonth={selectedMonth} />}
						/>
					</div>
				</div>
			</div>

			{!flipped ? (
				<>
					{/* Front — Action Buttons */}
					<div className="quick-action-bar">
						<button
							type="button"
							className="action-pill-btn"
							onClick={() => setIsAdjustCashOpen(true)}
						>
							Adjust Cash
						</button>

						<button
							type="button"
							className="action-pill-btn"
							onClick={() => setIsCapitalOpen(true)}
						>
							Deploy Capital
						</button>

						<button type="button" className="action-pill-btn" onClick={openActiveAdd}>
							{subTabLabel}
						</button>
					</div>

					{/* Detail Mode Switcher */}
					<div className="sub-tab-switcher">
						{(
							[
								["income", "Income"],
								["expense", "Expense"],
								["assets", "Assets"],
								["liability", "Liability"],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								className={`sub-tab-btn ${activeCapitalSubTab === id ? "active" : ""}`}
								onClick={() => setActiveCapitalSubTab(id)}
							>
								{label}
							</button>
						))}
					</div>

					{/* Detail — Income */}
					{activeCapitalSubTab === "income" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div className="section-header">
								<div>
									<span className="section-title">Income Streams</span>
									<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
										Total MRR: ฿{formatMoney(totalMrr)}/mo
									</div>
								</div>
							</div>

							{entityRev.length === 0 ? (
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
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<span className="item-name">{rev.name}</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
														Tap to Edit
													</span>
												</div>
												<span className="item-sub">
													{rev.source.replace(/_/g, " ")} • {rev.frequency}
												</span>
											</div>
											<div className="item-amount-col">
												<span className="item-amount positive">
													+฿{formatMoney(rev.amount)}
												</span>
												<span className="item-badge" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)", color: "#059669" }}>
													{rev.frequency === "monthly" ? "MRR" : rev.frequency === "yearly" ? "YEARLY" : "ONE-TIME"}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Detail — Expense */}
					{activeCapitalSubTab === "expense" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div className="section-header">
								<div>
									<span className="section-title">Recurring Expenses & Subs</span>
									<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
										Total Monthly Run-rate: ฿{formatMoney(totalMonthlyExpenses)}/mo
									</div>
								</div>
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
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<span className="item-name">{sub.name}</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
														Tap to Edit
													</span>
												</div>
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
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div className="section-header">
								<div>
									<span className="section-title">Hardware & CapEx Assets</span>
									<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
										Book Value: ฿{formatMoney(totalBookValue)} • Dep: -฿{formatMoney(totalDepreciation)}/mo
									</div>
								</div>
							</div>

							{entityHw.length === 0 ? (
								<div className="card" style={{ textAlign: "center", color: "var(--slate-gray)", padding: "24px" }}>
									No hardware or equipment registered for this entity.
								</div>
							) : (
								<div className="item-list">
									{entityHw.map((hw) => {
										const dep = calculateAssetDepreciation(hw, "2026-10");
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
													<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
														<span className="item-name">{hw.name}</span>
														<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
															Tap to Edit
														</span>
													</div>
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
													<span style={{ fontSize: "11px", color: "var(--slate-gray)" }}>Book Value</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* Detail — Liability */}
					{activeCapitalSubTab === "liability" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
							<div className="section-header">
								<div>
									<span className="section-title">Liabilities & Debt Payments</span>
									<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
										Total Monthly Payments: ฿{formatMoney(totalMonthlyLiabilities)}/mo
									</div>
								</div>
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
												<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
													<span className="item-name">{liab.name}</span>
													<span className="item-badge" style={{ backgroundColor: "rgba(20, 20, 19, 0.05)", color: "var(--slate-gray)" }}>
														Tap to Edit
													</span>
												</div>
												<span className="item-sub">
													{liab.category.replace(/_/g, " ")}{liab.notes ? ` • ${liab.notes}` : ""}
												</span>
											</div>
											<div className="item-amount-col">
												<span className="item-amount negative">
													-฿{formatMoney(liab.amount)}
												</span>
												<span className="item-badge" style={{ backgroundColor: "rgba(207, 69, 0, 0.08)", color: "var(--signal-orange)" }}>
													/MO
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

									const matchSub = subscriptions.find((sb) => sb.id === act.reference);
									const matchHw = hardware.find((hw) => hw.id === act.reference);
									const matchRev = revenues.find((rv) => rv.id === act.reference);
									const itemImage = matchSub?.imageUrl || matchHw?.imageUrl || matchRev?.imageUrl;

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

			{/* Drawers & Modals */}
			<CapitalDrawer isOpen={isCapitalOpen} onClose={() => setIsCapitalOpen(false)} />
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
