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
	const { addHardware, updateHardware, deleteHardware, activeEntityId, selectedMonth } = useBiz();

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [cost, setCost] = useState("");
	const [lifespanMonths, setLifespanMonths] = useState("36");
	const [purchaseDate, setPurchaseDate] = useState(selectedMonth);
	const [category, setCategory] = useState("workstation");
	const [imageUrl, setImageUrl] = useState("");
	const [isDefault, setIsDefault] = useState(false);

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setCost(String(initialData.cost));
			setLifespanMonths(String(initialData.lifespanMonths));
			setPurchaseDate(initialData.purchaseDate === "Historical" ? "2024-01" : initialData.purchaseDate);
			setCategory(initialData.category);
			setImageUrl(initialData.imageUrl || "");
			setIsDefault(Boolean(initialData.isDefault));
		} else {
			setName("");
			setCost("");
			setLifespanMonths("36");
			setPurchaseDate(selectedMonth);
			setCategory("workstation");
			setImageUrl("");
			setIsDefault(false);
		}
	}, [initialData, isOpen, selectedMonth]);

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
				isDefault: isCash ? isDefault : undefined,
			});
		} else {
			addHardware({
				entityId: activeEntityId,
				name: name.trim(),
				cost: numCost,
				lifespanMonths: numLife,
				purchaseDate,
				category,
				imageUrl: imageUrl || undefined,
				isDefault: isCash ? isDefault : undefined,
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
	const numLife = Math.max(1, Number(lifespanMonths) || 1);
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
								<option value="mobile">Mobile & Tablets</option>
								<option value="audio">Audio & Monitoring</option>
								<option value="furniture">Ergonomics & Desk Setup</option>
								<option value="other">Other Work Equipment</option>
							</optgroup>
							<optgroup label="Liquid reserves">
								<option value="cash">Cash & Bank Balance (Non-depreciating)</option>
							</optgroup>
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">{isCash ? "Account / Reserve Name" : "Asset Name"}</label>
						<input
							className="form-input"
							placeholder={isCash ? "e.g. Kasikorn Savings, Main Operating Account" : "e.g. MacBook Pro M3 Max, Herman Miller Chair"}
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">{isCash ? "Balance (THB)" : "Purchase Cost (THB)"}</label>
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

					{isCash && (
						<div className="form-group" style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "4px" }}>
							<input
								type="checkbox"
								id="default-wallet-checkbox"
								checked={isDefault}
								onChange={(e) => setIsDefault(e.target.checked)}
								style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "var(--signal-orange)", cursor: "pointer" }}
							/>
							<label htmlFor="default-wallet-checkbox" style={{ fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
								Default Operating Wallet
								<div style={{ fontSize: "12px", color: "var(--slate-gray)", fontWeight: 400 }}>
									Absorbs net operating cashflow (income minus expenses) and untargeted transfers.
								</div>
							</label>
						</div>
					)}

					{!isCash && (
						<div className="form-group">
							<label className="form-label">Useful Lifespan (Months)</label>
							<div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
								{[12, 24, 36, 48, 60].map((m) => (
									<button
										key={m}
										type="button"
										className={`preset-chip-btn ${lifespanMonths === String(m) ? "active" : ""}`}
										onClick={() => setLifespanMonths(String(m))}
										style={{
											padding: "4px 8px",
											borderRadius: "6px",
											border: lifespanMonths === String(m) ? "1px solid var(--signal-orange)" : "1px solid rgba(0,0,0,0.1)",
											backgroundColor: lifespanMonths === String(m) ? "rgba(235, 0, 27, 0.08)" : "transparent",
											fontSize: "12px",
											cursor: "pointer",
										}}
									>
										{m}m ({m / 12}y)
									</button>
								))}
							</div>
							<input
								className="form-input"
								type="number"
								min={1}
								max={240}
								value={lifespanMonths}
								onChange={(e) => setLifespanMonths(e.target.value)}
								placeholder="36"
								required
							/>
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
					{isEditMode ? "Save Asset" : "Add Asset"}
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
