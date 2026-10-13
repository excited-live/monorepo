import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { HardwareAsset } from "@excited-live/biz";
import { ModalImageSection } from "./ModalImageSection";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

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

	const isCash = category === "cash";

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const numCost = Number(cost);
		const numLife = isCash ? 0 : Number(lifespanMonths);
		if (!name.trim() || !numCost) return;
		if (!isCash && !numLife) return;

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
	const assetNoun = isCash ? "Cash Asset" : "Hardware Asset";

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">{isEditMode ? `Edit ${assetNoun}` : `Add ${assetNoun}`}</span>
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

				<form id="gear-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Asset Type</label>
						<select
							className="form-select"
							value={category}
							onChange={(e) => {
								const next = e.target.value;
								setCategory(next);
								if (next !== "cash" && (Number(lifespanMonths) || 0) <= 0) {
									setLifespanMonths("36");
								}
							}}
							autoFocus={!isEditMode}
						>
							<optgroup label="Depreciating assets">
								<option value="workstation">Workstation / Computing</option>
								<option value="camera">Camera & Optics</option>
								<option value="audio">Audio Equipment</option>
								<option value="peripherals">Peripherals & Monitors</option>
								<option value="office">Office & Studio Fitout</option>
							</optgroup>
							<optgroup label="Cash & equivalents">
								<option value="cash">Cash / Bank Balance</option>
							</optgroup>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Asset Name</label>
						<input
							className="form-input"
							placeholder="e.g. Sony FX3 Cinema Rig"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Purchase Cost (THB)</label>
						<CurrencyInput
							placeholder="0.00"
							value={cost}
							onChange={setCost}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">{isCash ? "As-of Date (Month)" : "Purchase Date (Month)"}</label>
						<input
							className="form-input"
							type="month"
							value={purchaseDate}
							onChange={(e) => setPurchaseDate(e.target.value)}
							required
						/>
					</div>

					{!isCash && (
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
					)}

					{/* Depreciation Preview Card — cash holds full value instead */}
					{isCash ? (
						<div className="card" style={{ backgroundColor: "rgba(5, 150, 105, 0.08)" }}>
							<span className="section-title">Cash & Equivalents</span>
							<div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>
								฿ {formatMoney(numCost)}
							</div>
							<div style={{ fontSize: "12px", color: "var(--slate-gray)", marginTop: "2px" }}>
								Held at full value — no depreciation. Counts as liquid in the hero balance.
							</div>
						</div>
					) : (
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
					)}
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
					{isEditMode ? "Save Changes" : isCash ? "Log Cash Asset" : "Log Hardware Asset"}
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
