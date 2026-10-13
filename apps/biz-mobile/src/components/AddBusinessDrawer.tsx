import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { EntityAccount } from "@excited-live/biz";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

interface AddBusinessDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: EntityAccount | null;
}

const ORG_IMAGE_PRESETS = [
	{ label: "Modern Architecture", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80" },
	{ label: "Minimalist Loft", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80" },
	{ label: "High-Tech Glass", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80" },
	{ label: "Creative Studio", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80" },
];

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
				{/* Image Banner Preview if exists */}
				{imageUrl ? (
					<div className="modal-image-preview-container">
						<img src={imageUrl} alt="Org Cover Preview" className="modal-image-preview" />
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
						{isEditMode
							? `Update profile, cover backdrop, and treasury for ${initialData?.name}.`
							: "Create a separate legal or operational entity to track independent runway, MRR, and hardware."}
					</div>
				)}

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
						<input
							className="form-input"
							type="number"
							inputMode="decimal"
							placeholder="0.00"
							value={initialCash}
							onChange={(e) => setInitialCash(e.target.value)}
						/>
					</div>

					{/* Image Cover for Organization / Hero Background */}
					<div className="form-group">
						<label className="form-label">Backdrop Cover Image</label>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<input
								className="form-input"
								placeholder="Image URL (https://...)"
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

						{/* Presets */}
						<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
							{ORG_IMAGE_PRESETS.map((p) => (
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
