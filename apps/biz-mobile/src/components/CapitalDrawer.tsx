import { CurrencyInput } from "./CurrencyInput";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { calculateAssetDepreciation, calculateMonthlyEquivalent, round2, simulateCapitalTransfer } from "@excited-live/biz";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";
import { formatMoney } from "../utils/format";

export const CapitalDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
	isOpen,
	onClose,
}) => {
	const { accounts, subscriptions, hardware, revenues, injectCapital, activeEntityId } = useBiz();

	const { dismiss } = useModalBack(isOpen, onClose);

	const personalAccount = accounts.find((a) => a.type === "personal") || accounts[0]!;
	const businessAccounts = accounts.filter((a) => a.type === "business");

	const defaultTarget = businessAccounts.find((b) => b.id === activeEntityId) || businessAccounts[0] || personalAccount;
	const [targetBizId, setTargetBizId] = useState(defaultTarget.id);
	const [amount, setAmount] = useState<string>("20000");
	const [note, setNote] = useState<string>("Founder seed capital");

	if (!isOpen) return null;

	const targetBiz = accounts.find((a) => a.id === targetBizId) || businessAccounts[0]!;
	const transferAmount = Number(amount) || 0;

	// Calculate personal net burn
	const personalSubs = subscriptions.filter((s) => s.entityId === personalAccount.id && s.active);
	const personalHw = hardware.filter((h) => h.entityId === personalAccount.id);
	const personalBurn = round2(
		personalSubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
			personalHw.reduce((acc, h) => acc + calculateAssetDepreciation(h, "2026-10").monthlyRate, 0),
	);

	// Calculate target biz net burn
	const bizSubs = subscriptions.filter((s) => s.entityId === targetBiz.id && s.active);
	const bizHw = hardware.filter((h) => h.entityId === targetBiz.id);
	const bizRev = revenues.filter((r) => r.entityId === targetBiz.id && r.active);
	const bizOutflow = round2(
		bizSubs.reduce((acc, s) => acc + calculateMonthlyEquivalent(s.amount, s.cycle), 0) +
			bizHw.reduce((acc, h) => acc + calculateAssetDepreciation(h, "2026-10").monthlyRate, 0),
	);
	const bizInflow = round2(bizRev.reduce((acc, r) => acc + r.amount, 0));
	const bizNetBurn = Math.max(1, bizOutflow - bizInflow);

	const simulation = simulateCapitalTransfer(
		personalAccount.cashReserve,
		personalBurn,
		targetBiz.cashReserve,
		bizNetBurn,
		transferAmount,
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (transferAmount <= 0) return;
		injectCapital(personalAccount.id, targetBiz.id, transferAmount, note);
		dismiss();
	};

	const canSubmit = transferAmount > 0 && transferAmount <= personalAccount.cashReserve;

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			{/* Top Bar with Title on Left, ✕ on Top-Right */}
			<div className="modal-page-nav">
				<span className="modal-nav-title">Transfer Capital</span>
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
				<div style={{ fontSize: "13px", color: "var(--slate-gray)" }}>
					Deploy seed funds from Personal reserve into business treasury.
				</div>

				<form id="capital-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div className="form-group">
						<label className="form-label">Source Reserve</label>
						<input
							className="form-input"
							value={`Personal (Available: ฿${formatMoney(personalAccount.cashReserve)})`}
							disabled
							style={{ opacity: 0.8 }}
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Target Business</label>
						<select
							className="form-select"
							value={targetBizId}
							onChange={(e) => setTargetBizId(e.target.value)}
						>
							{businessAccounts.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name} (Treasury: ฿{formatMoney(b.cashReserve)})
								</option>
							))}
						</select>
					</div>

					<div className="form-group">
						<label className="form-label">Transfer Amount (THB)</label>
						<CurrencyInput
							value={amount}
							onChange={setAmount}
							required
							autoFocus
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Reference Note</label>
						<input
							className="form-input"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="e.g. Founder seed for server costs"
						/>
					</div>

					{/* Live Runway Impact Simulation Box */}
					<div className="card" style={{ backgroundColor: "rgba(20, 20, 19, 0.03)" }}>
						<span className="section-title">
							Simulated Runway Impact
						</span>
						<div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
							<span style={{ color: "var(--slate-gray)" }}>Personal Runway</span>
							<span style={{ fontWeight: 600 }}>
								{personalBurn > 0 ? round2(personalAccount.cashReserve / personalBurn) : "∞"} mos →{" "}
								<span style={{ color: "var(--signal-orange)" }}>{simulation.fromNewRunway} mos</span>
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
							<span style={{ color: "var(--slate-gray)" }}>{targetBiz.name} Runway</span>
							<span style={{ fontWeight: 600 }}>
								{bizNetBurn > 0 ? round2(targetBiz.cashReserve / bizNetBurn) : "∞"} mos →{" "}
								<span style={{ color: "#059669" }}>{simulation.toNewRunway} mos</span>
							</span>
						</div>
					</div>
				</form>
			</div>

			{/* Sticky Bottom Action Bar */}
			<div className="modal-sticky-footer">
				<button
					type="submit"
					form="capital-form"
					className="submit-btn"
					disabled={!canSubmit}
					style={{ opacity: canSubmit ? 1 : 0.4 }}
				>
					Confirm Transfer (฿{formatMoney(transferAmount)})
				</button>
			</div>
		</div>,
		document.body,
	);
};
