import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { EntityAccount } from "@excited-live/biz";
import { ModalImageSection } from "./ModalImageSection";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

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
	const [initialCash, setInitialCash] = useState("");
	const [imageUrl, setImageUrl] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setInitialCash(String(initialData.cashReserve));
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setInitialCash("");
			setImageUrl("");
		}
	}, [initialData, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const cash = Number(initialCash) || 0;

		if (initialData) {
			updateBusiness(initialData.id, name.trim(), cash, imageUrl || undefined);
		} else {
			addBusiness(name.trim(), cash, imageUrl || undefined);
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Are you sure you want to delete venture "${initialData.name}"? All associated hardware, subscriptions, and revenue will also be removed.`)) {
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
					{isEditMode ? "Edit Venture Entity" : "Add Business Venture"}
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

					<div className="form-group">
						<label className="form-label">
							{isEditMode ? "Treasury Balance (THB)" : "Initial Treasury (THB)"}
						</label>
						<CurrencyInput
							placeholder="0.00"
							value={initialCash}
							onChange={setInitialCash}
						/>
					</div>

					{/* Image Cover for Organization / Hero Background */}
				</form>
			</div>

			{/* Sticky Bottom Action Bar (Sits directly above keyboard) */}
			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="business-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isEditMode ? "Save Venture" : "Create Venture"}
				</button>

				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Venture
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
