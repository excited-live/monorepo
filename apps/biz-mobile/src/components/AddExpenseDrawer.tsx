import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { isCashAsset, type BillingCycle, type RecurringSubscription } from "@excited-live/biz";
import { formatMoney } from "../utils/format";
import { ModalImageSection } from "./ModalImageSection";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

export const AddExpenseDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RecurringSubscription | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addSubscription, updateSubscription, deleteSubscription, accounts, hardware, injectCapital } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";
	const businessAccounts = accounts.filter((a) => a.type === "business");

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory = isPersonal ? "housing" : "dev_tool";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [cycle, setCycle] = useState<BillingCycle>("monthly");
	const [category, setCategory] = useState(defaultCategory);
	const [targetBizId, setTargetBizId] = useState(businessAccounts[0]?.id || "");
	const [renewalDate, setRenewalDate] = useState("2026-11-01");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [targetAssetId, setTargetAssetId] = useState("");
	const [frequency, setFrequency] = useState<"one_time" | "monthly">("one_time");

	const targetBiz = accounts.find((a) => a.id === targetBizId) || businessAccounts[0];
	const targetBizCashAssets = targetBiz ? hardware.filter((h) => h.entityId === targetBiz.id && isCashAsset(h)) : [];
	const availablePersonalCash = activeAccount.cashReserve;

	const handleTargetBizChange = (newBizId: string) => {
		setTargetBizId(newBizId);
		const cashHw = hardware.filter((h) => h.entityId === newBizId && isCashAsset(h));
		setTargetAssetId(cashHw[0]?.id || "primary_cash");
	};

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setCycle(initialData.cycle);
			setCategory(initialData.category);
			setRenewalDate(initialData.nextRenewalDate);
			setNotes(initialData.notes || "");
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setAmount("");
			setCycle("monthly");
			setCategory(isPersonal ? "housing" : "dev_tool");
			setRenewalDate("2026-11-01");
			setNotes("");
			setImageUrl("");
			if (businessAccounts[0]) {
				const bId = businessAccounts[0].id;
				setTargetBizId(bId);
				const cashHw = hardware.filter((h) => h.entityId === bId && isCashAsset(h));
				setTargetAssetId(cashHw[0]?.id || "primary_cash");
			}
			setFrequency("one_time");
		}
	}, [initialData, isOpen, isPersonal, hardware, businessAccounts]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		if (category === "capital_deploy" && isPersonal) {
			const resolvedAssetId = targetAssetId === "primary_cash" ? undefined : targetAssetId || undefined;
			injectCapital(
				activeEntityId,
				targetBizId || (businessAccounts[0]?.id ?? ""),
				num,
				name.trim() || "Founder seed capital",
				frequency === "monthly" ? "monthly" : "one_time",
				resolvedAssetId,
			);
			dismiss();
			return;
		}

		if (initialData) {
			updateSubscription({
				...initialData,
				name: name.trim(),
				amount: num,
				cycle,
				category,
				nextRenewalDate: renewalDate,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		} else {
			addSubscription({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				cycle,
				category,
				nextRenewalDate: renewalDate,
				active: true,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove subscription "${initialData.name}"?`)) {
			deleteSubscription(initialData.id);
			dismiss();
		}
	};

	const isDeploy = category === "capital_deploy" && isPersonal;
	const canSubmit = isDeploy
		? Number(amount) > 0 && Number(amount) <= availablePersonalCash
		: name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">
					{isEditMode ? "Edit Outflow / Expense" : "Add Outflow / Expense"}
				</span>
				<button
					type="button"
					className="modal-nav-close"
					onClick={dismiss}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			{/* Full-Screen Scrollable Content */}
			<div className="modal-page-content">
				{!isDeploy && <ModalImageSection value={imageUrl} onChange={(v) => setImageUrl(v ?? "")} />}

				<form id="expense-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Category</label>
						<select
							className="form-select"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							autoFocus={!isEditMode}
						>
							{isPersonal ? (
								<>
									<option value="housing">Housing & Rent</option>
									<option value="food">Food & Dining</option>
									<option value="groceries">Groceries & Household</option>
									<option value="transit">Transit & Transport</option>
									<option value="healthcare">Healthcare & Wellness</option>
									<option value="entertainment">Subscriptions & Living</option>
									<option value="connectivity">Internet & Mobile</option>
									<option value="family">Family & Personal</option>
									{businessAccounts.length > 0 && (
										<option value="capital_deploy">Deploy Capital to Business</option>
									)}
									<option value="other">Other Personal Outflow</option>
								</>
							) : (
								<>
									<option value="dev_tool">Developer Tools & APIs</option>
									<option value="saas">SaaS & Productivity</option>
									<option value="infrastructure">Hosting & Infrastructure</option>
									<option value="transit">Transit & Transport</option>
									<option value="connectivity">Internet & Mobile</option>
									<option value="office">Office & Workspace</option>
									<option value="marketing">Marketing & Sales</option>
									<option value="other">Other Business Outflow</option>
								</>
							)}
						</select>
					</div>

					{isDeploy ? (
						<>
							<div className="form-group">
								<label className="form-label">Source Reserve</label>
								<input
									className="form-input"
									value={`Personal (Available: ฿${formatMoney(availablePersonalCash)})`}
									disabled
									style={{ opacity: 0.8 }}
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Recipient Business</label>
								<select
									className="form-select"
									value={targetBizId}
									onChange={(e) => handleTargetBizChange(e.target.value)}
								>
									{businessAccounts.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
							</div>

							<div className="form-group">
								<label className="form-label">Target Cash Account / Asset</label>
								<select
									className="form-select"
									value={targetAssetId}
									onChange={(e) => setTargetAssetId(e.target.value)}
								>
									{targetBizCashAssets.length > 0 ? (
										targetBizCashAssets.map((asset) => (
											<option key={asset.id} value={asset.id}>
												{asset.name} (Current: ฿{formatMoney(asset.cost)})
											</option>
										))
									) : (
										<option value="primary_cash">Primary Cash Account</option>
									)}
								</select>
								<div style={{ fontSize: "11px", color: "var(--slate-gray)", marginTop: "4px" }}>
									Choose the specific cash account receiving this capital injection.
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Transfer Schedule</label>
								<div className="sub-tab-switcher" style={{ marginBottom: "4px" }}>
									<button
										type="button"
										className={`sub-tab-btn ${frequency === "one_time" ? "active" : ""}`}
										onClick={() => setFrequency("one_time")}
									>
										One-Time Injection
									</button>
									<button
										type="button"
										className={`sub-tab-btn ${frequency === "monthly" ? "active" : ""}`}
										onClick={() => setFrequency("monthly")}
									>
										Monthly Recurring
									</button>
								</div>
								<div style={{ fontSize: "11px", color: "var(--slate-gray)" }}>
									{frequency === "monthly"
										? "Transfers automatically every month starting from selected month."
										: "One-off capital injection for this month only."}
								</div>
							</div>

							<div className="form-group">
								<label className="form-label">Transfer Amount (THB)</label>
								<CurrencyInput
									placeholder="0.00"
									value={amount}
									onChange={setAmount}
									required
									autoFocus
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Injection / Transfer Date</label>
								<input
									type="date"
									className="form-input"
									value={renewalDate}
									onChange={(e) => setRenewalDate(e.target.value)}
									required
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Transfer Reference / Note</label>
								<input
									className="form-input"
									placeholder="e.g. Founder seed capital, operational buffer"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
						</>
					) : (
						<>
							<div className="form-group">
								<label className="form-label">Service / Vendor Name</label>
								<input
									className="form-input"
									placeholder={
										isPersonal
											? "e.g. Netflix, Apartment Rent, Gym, Groceries"
											: "e.g. Figma Organization, OpenAI API, AWS"
									}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Amount (THB)</label>
								<CurrencyInput
									placeholder="0.00"
									value={amount}
									onChange={setAmount}
									required
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Payment Frequency</label>
								<select
									className="form-select"
									value={cycle}
									onChange={(e) => setCycle(e.target.value as BillingCycle)}
								>
									<option value="one_time">One-Time Payment</option>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
									<option value="quarterly">Quarterly</option>
									<option value="semi-annual">Semi-Annual</option>
									<option value="weekly">Weekly</option>
								</select>
							</div>

							<div className="form-group">
								<label className="form-label">
									{cycle === "one_time" ? "Payment / Charge Date" : "Next Renewal / Charge Date"}
								</label>
								<input
									className="form-input"
									type="date"
									value={renewalDate}
									onChange={(e) => setRenewalDate(e.target.value)}
									required
								/>
							</div>

							<div className="form-group">
								<label className="form-label">Notes (Optional)</label>
								<input
									className="form-input"
									placeholder="e.g. Workspace license, tier 2"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
								/>
							</div>
						</>
					)}
				</form>
			</div>

			{/* Sticky Bottom Action Bar */}
			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="expense-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isDeploy ? "Confirm Capital Injection" : isEditMode ? "Save Changes" : "Add Expense"}
				</button>
				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Expense
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
