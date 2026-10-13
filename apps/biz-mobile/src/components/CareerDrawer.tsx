import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";

export const CareerDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
}> = ({ isOpen, onClose }) => {
	const { accounts, setCareerIncome } = useBiz();
	const personal = accounts.find((a) => a.type === "personal") || accounts[0]!;

	const { dismiss } = useModalBack(isOpen, onClose);

	const [salary, setSalary] = useState("");
	const [payday, setPayday] = useState("28");

	useEffect(() => {
		if (isOpen) {
			setSalary(personal.salary ? String(personal.salary) : "");
			setPayday(String(personal.paydayDayOfMonth ?? 28));
		}
	}, [isOpen, personal]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(salary);
		if (!num || num <= 0) return;
		const day = Math.min(Math.max(Number(payday) || 28, 1), 31);
		setCareerIncome(personal.id, num, day);
		dismiss();
	};

	const canSubmit = Number(salary) > 0;

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			<div className="modal-page-nav">
				<span className="modal-nav-title">Add Career Income</span>
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
					Your career salary counts as personal income and feeds the run rate and runway projection.
				</div>

				<form id="career-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Monthly Salary (THB)</label>
						<input
							className="form-input"
							type="number"
							inputMode="decimal"
							placeholder="e.g. 75000"
							value={salary}
							onChange={(e) => setSalary(e.target.value)}
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Payday (Day of Month)</label>
						<input
							className="form-input"
							type="number"
							inputMode="numeric"
							min={1}
							max={31}
							placeholder="28"
							value={payday}
							onChange={(e) => setPayday(e.target.value)}
							required
						/>
					</div>
				</form>
			</div>

			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="career-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					Save Career Income
				</button>
			</div>
		</div>,
		document.body,
	);
};
