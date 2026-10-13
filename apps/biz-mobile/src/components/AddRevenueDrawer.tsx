import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { RevenueStream } from "@excited-live/biz";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

const REVENUE_IMAGE_PRESETS = [
	{ label: "Client Retainer", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=200&q=80" },
	{ label: "Product Sales", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=200&q=80" },
	{ label: "Consulting", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=200&q=80" },
];

export const AddRevenueDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RevenueStream | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addRevenue, updateRevenue, deleteRevenue, accounts } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [frequency, setFrequency] = useState<"monthly" | "one_time">("monthly");
	const [source, setSource] = useState<"stripe" | "bank_transfer" | "cash">("stripe");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setFrequency(initialData.frequency);
			setSource(initialData.source);
			setNotes(initialData.notes || "");
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setAmount("");
			setFrequency("monthly");
			setSource("stripe");
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
			updateRevenue({
				...initialData,
				name: name.trim(),
				amount: num,
				frequency,
				source,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		} else {
			addRevenue({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				frequency,
				source,
				active: true,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove revenue stream "${initialData.name}"?`)) {
			deleteRevenue(initialData.id);
			dismiss();
		}
	};

	const canSubmit = name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">{isEditMode ? "Edit Revenue Stream" : "Log Inflow / Revenue"}</span>
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
						<img src={imageUrl} alt="Revenue Icon" className="modal-image-preview" />
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
						Income stream credited directly to <strong>{activeAccount.name}</strong>.
					</div>
				)}

				<form id="revenue-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Stream / Client Name</label>
						<input
							className="form-input"
							placeholder="e.g. Acme Corp Retainer, Stripe MRR"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							autoFocus={!isEditMode}
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
						<label className="form-label">Client Logo / Photo</label>
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
							{REVENUE_IMAGE_PRESETS.map((p) => (
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
						<label className="form-label">Frequency</label>
						<select
							className="form-select"
							value={frequency}
							onChange={(e) => setFrequency(e.target.value as "monthly" | "one_time")}
						>
							<option value="monthly">Monthly Recurring MRR</option>
							<option value="one_time">One-Time Inflow / Deposit</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Source Channel</label>
						<select
							className="form-select"
							value={source}
							onChange={(e) => setSource(e.target.value as "stripe" | "bank_transfer" | "cash")}
						>
							<option value="stripe">Stripe Payments</option>
							<option value="bank_transfer">B2B Direct Bank Invoice</option>
							<option value="cash">Manual Cash / Founder Injection</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Contract / Notes (Optional)</label>
						<input
							className="form-input"
							placeholder="e.g. Net-30 terms, milestone 1 of 3"
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
					form="revenue-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isEditMode ? "Save Changes" : "Log Inflow"}
				</button>

				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Stream
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
