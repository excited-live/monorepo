import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { BillingCycle, RecurringSubscription } from "@excited-live/biz";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

const EXPENSE_IMAGE_PRESETS = [
	{ label: "AI Dev", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=80" },
	{ label: "Transit", url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=200&q=80" },
	{ label: "Fiber Net", url: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=200&q=80" },
	{ label: "Automation", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80" },
];

export const AddExpenseDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RecurringSubscription | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addSubscription, updateSubscription, deleteSubscription, accounts } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [cycle, setCycle] = useState<BillingCycle>("monthly");
	const [category, setCategory] = useState("dev_tool");
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
			setCategory("dev_tool");
			setRenewalDate("2026-11-01");
			setNotes("");
			setImageUrl("");
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				if (typeof reader.result === "string") {
					setImageUrl(reader.result);
				}
			};
			reader.readAsDataURL(file);
		}
	};

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
				{/* Image Header Preview if set */}
				{imageUrl ? (
					<div className="modal-image-preview-container">
						<img src={imageUrl} alt="Expense Icon" className="modal-image-preview" />
						<button
							type="button"
							className="modal-image-remove-btn"
							onClick={() => setImageUrl("")}
						>
							Remove Image
						</button>
					</div>
				) : (
					<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
						Recurring fixed cost logged against <strong>{activeAccount.name}</strong>.
					</div>
				)}

				<form id="expense-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Service / Vendor Name</label>
						<input
							className="form-input"
							placeholder="e.g. Figma Organization, OpenAI API"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Amount (THB)</label>
						<input
							className="form-input"
							type="number"
							inputMode="decimal"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Item Icon / Image</label>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<input
								className="form-input"
								placeholder="Image URL"
								value={imageUrl}
								onChange={(e) => setImageUrl(e.target.value)}
								style={{ flex: 1 }}
							/>
							<label className="upload-pill-btn">
								Upload
								<input
									type="file"
									accept="image/*"
									onChange={handleFileUpload}
									style={{ display: "none" }}
								/>
							</label>
						</div>
						<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
							{EXPENSE_IMAGE_PRESETS.map((p) => (
								<button
									key={p.label}
									type="button"
									className="preset-chip-btn"
									onClick={() => setImageUrl(p.url)}
								>
									{p.label}
								</button>
							))}
						</div>
					</div>

					<div className="form-group">
						<label className="form-label">Billing Cycle</label>
						<select
							className="form-select"
							value={cycle}
							onChange={(e) => setCycle(e.target.value as BillingCycle)}
						>
							<option value="monthly">Monthly</option>
							<option value="yearly">Yearly (Amortised)</option>
							<option value="quarterly">Quarterly</option>
							<option value="weekly">Weekly</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Category</label>
						<select
							className="form-select"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="dev_tool">Developer Tools & APIs</option>
							<option value="saas">SaaS & Productivity</option>
							<option value="infrastructure">Hosting & Domains</option>
							<option value="transit">Transit & Transport</option>
							<option value="connectivity">Internet & Mobile</option>
							<option value="office">Office & Workspace</option>
							<option value="other">Other Outflow</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Next Renewal Date</label>
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
							placeholder="e.g. 5 seats, auto-renews via credit card"
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
					{isEditMode ? "Save Changes" : "Log Recurring Outflow"}
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
