import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { BillingCycle, RecurringSubscription } from "@excited-live/biz";
import { ModalImageSection } from "./ModalImageSection";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

export const AddExpenseDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RecurringSubscription | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addSubscription, updateSubscription, deleteSubscription, accounts } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory = isPersonal ? "housing" : "dev_tool";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [cycle, setCycle] = useState<BillingCycle>("monthly");
	const [category, setCategory] = useState(defaultCategory);
	const [renewalDate, setRenewalDate] = useState("2026-11-01");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");

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
		}
	}, [initialData, isOpen, isPersonal]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

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

	const canSubmit = name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">{isEditMode ? "Edit Recurring Expense" : "Add Recurring Expense"}</span>
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
				<ModalImageSection value={imageUrl} onChange={(v) => setImageUrl(v ?? "")} />

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
						<label className="form-label">Billing Frequency</label>
						<select
							className="form-select"
							value={cycle}
							onChange={(e) => setCycle(e.target.value as BillingCycle)}
						>
							<option value="monthly">Monthly</option>
							<option value="yearly">Yearly</option>
							<option value="quarterly">Quarterly</option>
							<option value="semi-annual">Semi-Annual</option>
							<option value="weekly">Weekly</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Next Renewal / Charge Date</label>
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
					{isEditMode ? "Save Expense" : "Add Expense"}
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
