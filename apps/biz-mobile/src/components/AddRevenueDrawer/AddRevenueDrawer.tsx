import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { FormField, InputField, SelectField } from "../FormField";
import { ModalPage } from "../ModalPage";
import { AutofillBanner, SuggestionChips } from "../AutofillHints";
import { CurrencyInput } from "../CurrencyInput";
import { resolveCatalogAmount, type RevenueStream } from "@excited-live/accounting";
import { ModalImageSection } from "../ModalImageSection";
import { useModalBack } from "../../hooks/useModalBack";
import { useCatalogAutofill, type AutofillValues } from "../../hooks/useCatalogAutofill";
import { useFinances, useAppUI } from "../../state";

export const AddRevenueDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RevenueStream | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { addRevenue, updateRevenue, deleteRevenue, accounts, revenues, setCareerIncome } = useFinances();
	const { activeEntityId, today } = useAppUI();
	const currentMonth = today.slice(0, 7);
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";
	const currency = activeAccount.currency || "THB";

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [frequency, setFrequency] = useState<RevenueStream["frequency"]>("monthly");
	const [source, setSource] = useState<"stripe" | "bank_transfer" | "cash" | "freelance" | "salary" | "other">(
		isPersonal ? "freelance" : "stripe",
	);
	const [startMonth, setStartMonth] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");

	const sourceOptions = isPersonal
		? [
				["salary", "Career / Salary"],
				["freelance", "Freelance / Side Income"],
				["bank_transfer", "Bank Transfer"],
				["cash", "Cash"],
				["other", "Other"],
			]
		: [
				["stripe", "Stripe Payments"],
				["bank_transfer", "B2B Direct Bank Invoice"],
				["cash", "Manual Cash"],
				["other", "Other"],
			];
	// A personal salary stream IS the career (title/company/payday live on the account).
	const isCareer = isPersonal && source === "salary";

	// Smart catalog autofill with user-touch protection. A salary stream is
	// resolved against the career catalog (employers, benchmarks); every other
	// stream against the revenue catalog (platforms, retainer templates).
	const onApplyAutofill = (values: AutofillValues) => {
		if (values.amount !== undefined) setAmount(String(values.amount));
		if (values.cycle === "monthly" || values.cycle === "yearly") setFrequency(values.cycle);
		if (values.category && sourceOptions.some(([value]) => value === values.category)) {
			setSource(values.category as typeof source);
		}
		if (isCareer) {
			if (values.coverImageUrl) setImageUrl(values.coverImageUrl);
			else if (values.imageUrl) setImageUrl(values.imageUrl);
		} else if (values.imageUrl !== undefined) {
			setImageUrl(values.imageUrl);
		}
	};

	const { suggestions, matchedItem, handleQueryChange, applySuggestion, markTouched, resetTouched } =
		useCatalogAutofill({
			type: isCareer ? "career" : "revenue",
			currency,
			onApplyAutofill,
		});

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setFrequency(initialData.frequency);
			setSource(initialData.source);
			setStartMonth(initialData.startMonth || currentMonth);
			setEndMonth(initialData.endMonth || "");
			setNotes(initialData.notes || "");
			setImageUrl(initialData.imageUrl || "");
			markTouched("amount");
			markTouched("cycle");
			markTouched("category");
			markTouched("imageUrl");
		} else {
			setName("");
			setAmount("");
			setFrequency("monthly");
			setSource(isPersonal ? "freelance" : "stripe");
			setStartMonth(currentMonth);
			setEndMonth("");
			setNotes("");
			setImageUrl("");
			resetTouched();
		}
	}, [initialData, isOpen, isPersonal, currentMonth, markTouched, resetTouched]);

	if (!isOpen) return null;

	const handleNameChange = (val: string) => {
		setName(val);
		handleQueryChange(val, { amount, cycle: frequency, category: source, imageUrl });
	};

	const handleAmountChange = (val: string) => {
		markTouched("amount");
		setAmount(val);
	};

	const handleFrequencyChange = (val: RevenueStream["frequency"]) => {
		markTouched("cycle");
		setFrequency(val);
	};

	const handleSourceChange = (val: typeof source) => {
		markTouched("category");
		setSource(val);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		const payload = {
			name: name.trim(),
			amount: num,
			frequency,
			source,
			startMonth,
			// One-time income lands in its start month only
			endMonth: frequency === "one_time" ? undefined : endMonth || undefined,
			notes: notes.trim() || undefined,
			imageUrl: imageUrl || undefined,
		};

		if (initialData) {
			updateRevenue({ ...initialData, ...payload });
		} else {
			addRevenue({
				entityId: activeEntityId,
				...payload,
				active: true,
			});
		}

		// Mirror the career identity onto the account only when this salary is (or
		// edits) the primary career stream. A projected promotion is a second,
		// future-dated salary stream: syncing it here would overwrite the current
		// salary and its start/end months.
		const hasOtherSalaryStream = revenues.some(
			(r) => r.entityId === activeEntityId && r.source === "salary" && r.id !== initialData?.id,
		);
		if (source === "salary" && isPersonal && !hasOtherSalaryStream) {
			setCareerIncome(
				activeEntityId,
				num,
				28,
				name.trim(),
				notes.trim() || undefined,
				imageUrl || undefined,
				startMonth,
				endMonth || undefined,
			);
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove revenue stream "${initialData.name}"?`)) {
			deleteRevenue(initialData.id);
			if (initialData.source === "salary" && isPersonal) {
				setCareerIncome(activeEntityId, 0, 28);
			}
			dismiss();
		}
	};

	// Every income needs a start month; the end month is optional (open-ended)
	const hasValidMonths = Boolean(startMonth) && (!endMonth || frequency === "one_time" || endMonth >= startMonth);
	const canSubmit = name.trim().length > 0 && Number(amount) > 0 && hasValidMonths;
	const isEditMode = Boolean(initialData);

	return (
		<ModalPage
			title={
				isCareer
					? isEditMode
						? "Edit Career"
						: "Log Career Income"
					: isEditMode
						? "Edit Revenue Stream"
						: "Log Inflow / Revenue"
			}
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="revenue-form"
						label={isEditMode ? "Save Changes" : "Log Inflow"}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>

					{isEditMode && (
						<Button label="Delete Stream" size="lg" variant="destructive" width="100%" onClick={handleDelete} />
					)}
				</>
			}
		>
			<ModalImageSection
				value={imageUrl}
				onChange={(v) => setImageUrl(v ?? "")}
				onUserTouched={() => markTouched("imageUrl")}
				aspectRatio={isCareer ? "cover" : "square"}
				showCuratedWallpapers={isCareer}
			/>

			<Stack as="form" id="revenue-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Source Channel"
					value={source}
					onChange={(e) => handleSourceChange(e.target.value as typeof source)}
					autoFocus={!isEditMode}
				>
					{sourceOptions.map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</SelectField>

				<Stack gap={1.5} width="100%">
					<InputField
						label="Stream / Client Name"
						placeholder={isPersonal ? "e.g. Freelance Project, Side Income" : "e.g. Acme Corp Retainer, Stripe MRR"}
						value={name}
						onChange={(e) => handleNameChange(e.target.value)}
						required
					/>

					{/* Quick Auto-Suggestion Chips */}
					{suggestions.length > 0 && (
						<SuggestionChips
							suggestions={suggestions.slice(0, 5)}
							onPick={(s) => {
								setName(s.name);
								applySuggestion(s as (typeof suggestions)[number]);
							}}
							renderMeta={(s) => {
								const itemAmount = resolveCatalogAmount(s as (typeof suggestions)[number], currency);
								if (itemAmount === undefined) return null;
								return currency === "USD" ? `$${itemAmount}` : `฿${itemAmount.toLocaleString()}`;
							}}
						/>
					)}

					{/* Match Info Banner */}
					{matchedItem && (
						<AutofillBanner badge="Auto-Filled">
							{matchedItem.name} {matchedItem.notes ? `• ${matchedItem.notes}` : ""}
						</AutofillBanner>
					)}
				</Stack>

				<FormField label={`Amount (${currency})`}>
					<CurrencyInput placeholder="0.00" value={amount} onChange={handleAmountChange} required />
				</FormField>

				<SelectField
					label="Frequency"
					value={frequency}
					onChange={(e) => handleFrequencyChange(e.target.value as typeof frequency)}
				>
					<option value="monthly">Monthly</option>
					<option value="yearly">Yearly</option>
					<option value="one_time">One-time</option>
				</SelectField>

				<HStack wrap="wrap" gap={2} width="100%">
					<InputField
						fieldClassName="flex-1 basis-[150px]"
						label={frequency === "one_time" ? "Month Received" : "Start Month"}
						type="month"
						value={startMonth}
						onChange={(e) => setStartMonth(e.target.value)}
						required
					/>
					{frequency !== "one_time" && (
						<InputField
							fieldClassName="flex-1 basis-[150px]"
							label="End Month (Optional)"
							type="month"
							value={endMonth}
							min={startMonth || undefined}
							onChange={(e) => setEndMonth(e.target.value)}
						/>
					)}
				</HStack>

				<InputField
					label={isPersonal ? "Note (Optional)" : "Contract / Notes (Optional)"}
					placeholder={isPersonal ? "e.g. Monthly side income" : "e.g. Net-30 terms, milestone 1 of 3"}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>
			</Stack>
		</ModalPage>
	);
};
