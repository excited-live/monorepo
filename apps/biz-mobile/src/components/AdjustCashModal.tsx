import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

export const AdjustCashModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
	isOpen,
	onClose,
}) => {
	const { accounts, activeEntityId, updateCashReserve } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;

	const { dismiss } = useModalBack(isOpen, onClose);
	const [amount, setAmount] = useState("");

	useEffect(() => {
		if (isOpen) {
			setAmount(String(activeAccount.cashReserve));
		}
	}, [isOpen, activeAccount.cashReserve]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (isNaN(num) || num < 0) return;
		updateCashReserve(activeAccount.id, num);
		dismiss();
	};

	const canSubmit = !isNaN(Number(amount)) && Number(amount) >= 0;

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">Adjust Cash Reserve</span>
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
					Update real-world bank or liquid cash balance for {activeAccount.name}.
				</div>

				<form id="adjust-cash-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Available Cash (THB)</label>
						<CurrencyInput
							placeholder="0.00"
							value={amount}
							onChange={setAmount}
							required
							autoFocus
						/>
					</div>
				</form>
			</div>

			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="adjust-cash-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					Update Cash Balance
				</button>
			</div>
		</div>,
		document.body,
	);
};
