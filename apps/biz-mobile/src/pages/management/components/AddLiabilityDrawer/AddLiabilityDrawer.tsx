import { CurrencyInput } from "../../../../components/CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { LiabilityCategory, LiabilityStream } from "@excited-live/biz";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useBiz } from "../../../../state";

export const AddLiabilityDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: LiabilityStream | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addLiability, updateLiability, deleteLiability, accounts } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory: LiabilityCategory = isPersonal ? "mortgage" : "business_loan";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<LiabilityCategory>(defaultCategory);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setCategory(initialData.category);
			setNotes(initialData.notes || "");
		} else {
			setName("");
			setAmount("");
			setCategory(isPersonal ? "mortgage" : "business_loan");
			setNotes("");
		}
	}, [initialData, isOpen, isPersonal]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		if (initialData) {
			updateLiability({
				...initialData,
				name: name.trim(),
				amount: num,
				category,
				notes: notes.trim() || undefined,
			});
		} else {
			addLiability({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				category,
				active: true,
				notes: notes.trim() || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove liability "${initialData.name}"?`)) {
			deleteLiability(initialData.id);
			dismiss();
		}
	};

	const canSubmit = name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			<div className="modal-page-nav">
				<span className="modal-nav-title">{isEditMode ? "Edit Liability" : "Register Liability"}</span>
				<button
					type="button"
					className="modal-nav-close"
					onClick={dismiss}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div className="modal-page-content">
				<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
					Recurring debt payment charged monthly against <strong>{activeAccount.name}</strong>. Counted into the run rate.
				</div>

				<form id="liability-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Type</label>
						<select
							className="form-select"
							value={category}
							onChange={(e) => setCategory(e.target.value as LiabilityCategory)}
							autoFocus={!isEditMode}
						>
							{isPersonal ? (
								<>
									<option value="mortgage">Home Mortgage / Housing Debt</option>
									<option value="car_loan">Auto / Vehicle Loan</option>
									<option value="student_loan">Student / Education Loan</option>
									<option value="credit_card">Credit Card Minimum / Personal Loan</option>
									<option value="other">Other Personal Debt</option>
								</>
							) : (
								<>
									<option value="business_loan">Business Loan</option>
									<option value="equipment_loan">Equipment Loan / Financing</option>
									<option value="credit_line">Credit Line Repayment</option>
									<option value="lease">Commercial Lease / Rental</option>
									<option value="other">Other Business Recurring Debt</option>
								</>
							)}
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Liability Name</label>
						<input
							className="form-input"
							placeholder={isPersonal ? "e.g. Home Mortgage, Auto Loan, Credit Card" : "e.g. Studio Equipment Loan, Credit Line"}
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Monthly Payment (THB)</label>
						<CurrencyInput
							placeholder="0.00"
							value={amount}
							onChange={setAmount}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Notes (Optional)</label>
						<input
							className="form-input"
							placeholder="e.g. 24 months remaining, KBank"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</div>
				</form>
			</div>

			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="liability-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isEditMode ? "Save Liability" : "Register Liability"}
				</button>

				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Liability
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
