import { CurrencyInput } from "../CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { EntityAccount } from "@excited-live/biz";
import { ModalImageSection } from "../ModalImageSection";
import { useModalBack } from "../../hooks/useModalBack";
import { useBiz } from "../../state";

interface AddBusinessDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: EntityAccount | null;
}

export const AddBusinessDrawer: React.FC<AddBusinessDrawerProps> = ({
	isOpen,
	onClose,
	initialData,
}) => {
	const { addBusiness, updateBusiness, deleteBusiness } = useBiz();
	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [startingTreasury, setStartingTreasury] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setImageUrl(initialData.imageUrl || "");
			setStartingTreasury("");
		} else {
			setName("");
			setImageUrl("");
			setStartingTreasury("");
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		if (initialData) {
			updateBusiness(initialData.id, name.trim(), imageUrl || undefined);
		} else {
			const initCash = Number(startingTreasury) || 0;
			addBusiness(name.trim(), imageUrl || undefined, initCash > 0 ? initCash : undefined);
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Are you sure you want to delete business "${initialData.name}"? All associated hardware, subscriptions, and revenue will also be removed.`)) {
			deleteBusiness(initialData.id);
			dismiss();
		}
	};

	const canSubmit = name.trim().length > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">
					{isEditMode ? "Edit Business" : "Add Business"}
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
				<ModalImageSection value={imageUrl} onChange={(v) => setImageUrl(v ?? "")} />

				<form id="business-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Business Name</label>
						<input
							className="form-input"
							placeholder="e.g. Studio Neon Co., Ltd."
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							autoFocus={!isEditMode}
						/>
					</div>

					{!isEditMode && (
						<div className="form-group">
							<label className="form-label">Starting Treasury / Capital (Optional)</label>
							<CurrencyInput
								placeholder="0.00"
								value={startingTreasury}
								onChange={setStartingTreasury}
							/>
							<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "-2px" }}>
								Initial liquid bank balance allocated to this business.
							</div>
						</div>
					)}

					<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "-6px", lineHeight: 1.45 }}>
						Treasury tracks liquid capital on hand, and projects end-of-month cash = liquid cash + revenues − operational burn.
					</div>
				</form>
			</div>

			{/* Sticky Bottom Action Bar */}
			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="business-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isEditMode ? "Save Business" : "Create Business"}
				</button>

				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Business
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
