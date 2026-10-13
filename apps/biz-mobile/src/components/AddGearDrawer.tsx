import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { HardwareAsset } from "@excited-live/biz";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

const GEAR_IMAGE_PRESETS = [
	{ label: "Camera Rig", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&q=80" },
	{ label: "Workstation", url: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=200&q=80" },
	{ label: "iPad / Tablet", url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=200&q=80" },
	{ label: "MacBook", url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80" },
];

export const AddGearDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: HardwareAsset | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { addHardware, updateHardware, deleteHardware, activeEntityId } = useBiz();

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [cost, setCost] = useState("");
	const [lifespanMonths, setLifespanMonths] = useState("36");
	const [purchaseDate, setPurchaseDate] = useState("2026-10");
	const [category, setCategory] = useState("workstation");
	const [imageUrl, setImageUrl] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setCost(String(initialData.cost));
			setLifespanMonths(String(initialData.lifespanMonths));
			setPurchaseDate(initialData.purchaseDate === "Historical" ? "2024-01" : initialData.purchaseDate);
			setCategory(initialData.category);
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setCost("");
			setLifespanMonths("36");
			setPurchaseDate("2026-10");
			setCategory("workstation");
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
		const numCost = Number(cost);
		const numLife = Number(lifespanMonths);
		if (!name.trim() || !numCost || !numLife) return;

		if (initialData) {
			updateHardware({
				...initialData,
				name: name.trim(),
				cost: numCost,
				lifespanMonths: numLife,
				purchaseDate,
				category,
				imageUrl: imageUrl || undefined,
			});
		} else {
			addHardware({
				entityId: activeEntityId,
				name: name.trim(),
				cost: numCost,
				purchaseDate,
				lifespanMonths: numLife,
				category,
				imageUrl: imageUrl || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove asset "${initialData.name}"?`)) {
			deleteHardware(initialData.id);
			dismiss();
		}
	};

	const numCost = Number(cost) || 0;
	const numLife = Number(lifespanMonths) || 1;
	const monthlyRate = Math.round(numCost / numLife);
	const canSubmit = name.trim().length > 0 && numCost > 0;
	const isEditMode = Boolean(initialData);

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">{isEditMode ? "Edit Hardware Asset" : "Add Hardware Asset"}</span>
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
						<img src={imageUrl} alt="Hardware Preview" className="modal-image-preview" />
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
							? "Update depreciation schedule and cost basis for this asset."
							: "Register capital hardware and track its monthly non-cash depreciation schedule."}
					</div>
				)}

				<form id="gear-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Asset Name</label>
						<input
							className="form-input"
							placeholder="e.g. Sony FX3 Cinema Rig"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							autoFocus={!isEditMode}
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Purchase Cost (THB)</label>
						<input
							className="form-input"
							type="number"
							inputMode="decimal"
							placeholder="0.00"
							value={cost}
							onChange={(e) => setCost(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Asset Photo / Icon</label>
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
							{GEAR_IMAGE_PRESETS.map((p) => (
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
						<label className="form-label">Category</label>
						<select
							className="form-select"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="workstation">Workstation / Computing</option>
							<option value="camera">Camera & Optics</option>
							<option value="audio">Audio Equipment</option>
							<option value="peripherals">Peripherals & Monitors</option>
							<option value="office">Office & Studio Fitout</option>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Purchase Date (Month)</label>
						<input
							className="form-input"
							type="month"
							value={purchaseDate}
							onChange={(e) => setPurchaseDate(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Useful Lifespan (Months)</label>
						<select
							className="form-select"
							value={lifespanMonths}
							onChange={(e) => setLifespanMonths(e.target.value)}
						>
							<option value="12">1 Year (12 mos - Consumable gear)</option>
							<option value="24">2 Years (24 mos - Rapid refresh)</option>
							<option value="36">3 Years (36 mos - Standard IT equipment)</option>
							<option value="60">5 Years (60 mos - Studio infrastructure)</option>
						</select>
					</div>

					{/* Depreciation Preview Card */}
					<div className="card" style={{ backgroundColor: "rgba(20, 20, 19, 0.03)" }}>
						<span className="section-title">
							Estimated Monthly Non-Cash Charge
						</span>
						<div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>
							-฿ {formatMoney(monthlyRate)} / month
						</div>
						<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
							Depreciated straight-line over {lifespanMonths} months.
						</div>
					</div>
				</form>
			</div>

			{/* Sticky Bottom Action Bar */}
			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="gear-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					{isEditMode ? "Save Changes" : "Log Hardware Asset"}
				</button>

				{isEditMode && (
					<button
						type="button"
						className="delete-btn"
						onClick={handleDelete}
					>
						Delete Asset
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
};
