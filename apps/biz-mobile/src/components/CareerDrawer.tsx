import { CurrencyInput } from "./CurrencyInput";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { resolveCatalogAmount } from "@excited-live/biz";
import { ModalImageSection } from "./ModalImageSection";
import { useModalBack } from "../hooks/useModalBack";
import { useBiz } from "../state";
import { useCatalogAutofill, type AutofillValues } from "../hooks/useCatalogAutofill";

export const CareerDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
}> = ({ isOpen, onClose }) => {
	const { accounts, revenues, setCareerIncome } = useBiz();
	const personal = accounts.find((a) => a.type === "personal") || accounts[0]!;
	const currency = personal.currency || "THB";

	const { dismiss } = useModalBack(isOpen, onClose);

	const careerRev = revenues.find(
		(r) => r.entityId === personal.id && (r.source === "salary" || r.id === "rev_career_prame"),
	);

	const [company, setCompany] = useState("");
	const [title, setTitle] = useState("");
	const [salary, setSalary] = useState("");
	const [payday, setPayday] = useState("28");
	const [startMonth, setStartMonth] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [coverImageUrl, setCoverImageUrl] = useState("");

	const {
		markTouched,
		resetTouched,
		suggestions,
		matchedItem,
		applySuggestion,
		handleQueryChange,
	} = useCatalogAutofill({
		type: "career",
		currency,
		debounceMs: 250,
		onApplyAutofill: (values: AutofillValues) => {
			if (values.amount !== undefined) {
				setSalary(String(values.amount));
			}
			if (values.coverImageUrl) {
				setCoverImageUrl(values.coverImageUrl);
			} else if (values.imageUrl) {
				setCoverImageUrl(values.imageUrl);
			}
		},
	});

	useEffect(() => {
		if (isOpen) {
			setCompany(personal.careerCompany || "");
			setTitle(personal.careerTitle || "");
			setSalary(personal.salary ? String(personal.salary) : "");
			setPayday(String(personal.paydayDayOfMonth ?? 28));
			setStartMonth(careerRev?.startMonth || "");
			setEndMonth(careerRev?.endMonth || "");
			setCoverImageUrl(personal.careerImageUrl || "");
			resetTouched();
			if (personal.salary) markTouched("amount");
			if (personal.careerImageUrl) markTouched("imageUrl");
		}
	}, [isOpen, personal, careerRev, markTouched, resetTouched]);

	if (!isOpen) return null;

	const handleCompanyChange = (val: string) => {
		setCompany(val);
		handleQueryChange(val, { amount: salary, imageUrl: coverImageUrl });
	};

	const handleSalaryChange = (val: string) => {
		markTouched("amount");
		setSalary(val);
	};

	const handleCoverChange = (val: string | undefined) => {
		setCoverImageUrl(val ?? "");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(salary);
		if (!num || num <= 0) return;
		const day = Math.min(Math.max(Number(payday) || 28, 1), 31);

		setCareerIncome(
			personal.id,
			num,
			day,
			title.trim() || undefined,
			company.trim() || undefined,
			coverImageUrl.trim() || undefined,
			startMonth || undefined,
			endMonth || undefined,
		);
		dismiss();
	};

	const canSubmit = Number(salary) > 0;

	return createPortal(
		<div className="fullscreen-modal-page" data-astryx-theme="mastercard">
			<div className="modal-page-nav">
				<span className="modal-nav-title">Career & Salary</span>
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
					Configure your employer and salary. The company cover image will serve as the hero background on your management page.
				</div>

				<form id="career-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					{/* Company / Office Hero Background */}
					<div className="form-group">
						<label className="form-label">Company / Office Cover Photo</label>
						<ModalImageSection
							value={coverImageUrl}
							onChange={handleCoverChange}
							onUserTouched={() => markTouched("imageUrl")}
							emptyLabel="Add Company Cover Image"
							aspectRatio="cover"
							showCuratedWallpapers={true}
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Company / Employer</label>
						<input
							className="form-input"
							placeholder="e.g. Agoda, LINE MAN Wongnai, Bitkub, KBTG"
							value={company}
							onChange={(e) => handleCompanyChange(e.target.value)}
						/>

						{/* Quick Company Suggestions */}
						{suggestions.length > 0 && (
							<div className="autofill-suggestion-scroll">
								{suggestions.slice(0, 5).map((s) => {
									const salaryBenchmark = resolveCatalogAmount(s, currency);
									return (
										<button
											key={s.id}
											type="button"
											className="autofill-suggestion-pill"
											onClick={() => {
												setCompany(s.name);
												applySuggestion(s);
											}}
										>
											{s.imageUrl && <img src={s.imageUrl} alt="" className="autofill-pill-img" />}
											<span>{s.name}</span>
											{salaryBenchmark !== undefined && (
												<span style={{ color: "var(--slate-gray)", fontSize: "10.5px" }}>
													{currency === "USD" ? `$${salaryBenchmark}` : `฿${salaryBenchmark.toLocaleString()}`}
												</span>
											)}
										</button>
									);
								})}
							</div>
						)}

						{/* Matched Banner */}
						{matchedItem && (
							<div className="autofill-banner">
								<div className="autofill-banner-text">
									<span className="autofill-banner-badge">Company Found</span>
									<span>{matchedItem.name} {matchedItem.notes ? `• ${matchedItem.notes}` : ""}</span>
								</div>
							</div>
						)}
					</div>

					<div className="form-group">
						<label className="form-label">Job Title / Role</label>
						<input
							className="form-input"
							placeholder="e.g. Senior Software Engineer, Design Lead"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Monthly Salary ({currency})</label>
						<CurrencyInput
							placeholder="0.00"
							value={salary}
							onChange={handleSalaryChange}
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

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
						<div className="form-group">
							<label className="form-label">Start Month (Optional)</label>
							<input
								className="form-input"
								type="month"
								value={startMonth}
								onChange={(e) => setStartMonth(e.target.value)}
							/>
						</div>
						<div className="form-group">
							<label className="form-label">End Month (Optional)</label>
							<input
								className="form-input"
								type="month"
								value={endMonth}
								onChange={(e) => setEndMonth(e.target.value)}
							/>
						</div>
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
