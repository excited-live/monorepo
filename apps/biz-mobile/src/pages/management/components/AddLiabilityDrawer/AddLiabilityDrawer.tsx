import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { AutofillBanner, SuggestionChips } from "../../../../components/AutofillHints";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import { ModalImageSection } from "../../../../components/ModalImageSection";
import { resolveCatalogAmount, type LiabilityCategory, type LiabilityStream } from "@excited-live/accounting";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useCatalogAutofill, type AutofillValues } from "../../../../hooks/useCatalogAutofill";
import { useFinances, useAppUI } from "../../../../state";

const PERSONAL_LIABILITY_TYPES: { value: LiabilityCategory; label: string }[] = [
	{ value: "mortgage", label: "Home Mortgage / Housing Debt" },
	{ value: "car_loan", label: "Auto / Vehicle Loan" },
	{ value: "student_loan", label: "Student / Education Loan" },
	{ value: "credit_card", label: "Credit Card Minimum / Personal Loan" },
	{ value: "other", label: "Other Personal Debt" },
];

const BUSINESS_LIABILITY_TYPES: { value: LiabilityCategory; label: string }[] = [
	{ value: "business_loan", label: "Business Loan" },
	{ value: "equipment_loan", label: "Equipment Loan / Financing" },
	{ value: "credit_line", label: "Credit Line Repayment" },
	{ value: "lease", label: "Commercial Lease / Rental" },
	{ value: "other", label: "Other Business Recurring Debt" },
];

export interface AddLiabilityDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	initialData?: LiabilityStream | null;
	canSkip?: boolean;
	onSkip?: () => void;
}

export const AddLiabilityDrawer: React.FC<AddLiabilityDrawerProps> = ({
	isOpen,
	onClose,
	initialData,
	canSkip,
	onSkip,
}) => {
	const { addLiability, updateLiability, deleteLiability, accounts } = useFinances();
	const { activeEntityId, today } = useAppUI();
	const currentMonth = today.slice(0, 7);
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";
	const currency = activeAccount.currency || "THB";
	const typeOptions = isPersonal ? PERSONAL_LIABILITY_TYPES : BUSINESS_LIABILITY_TYPES;

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory: LiabilityCategory = isPersonal ? "mortgage" : "business_loan";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<LiabilityCategory>(defaultCategory);
	const [imageUrl, setImageUrl] = useState("");
	const [notes, setNotes] = useState("");
	const [startMonth, setStartMonth] = useState(currentMonth);
	const [endMonth, setEndMonth] = useState("");

	// Smart catalog autofill with user-touch protection: typing a debt name
	// (mortgage, car loan, ...) suggests a preset and fills the matching type.
	const onApplyAutofill = (values: AutofillValues) => {
		if (values.amount !== undefined) setAmount(String(values.amount));
		if (values.category && typeOptions.some((option) => option.value === values.category)) {
			setCategory(values.category as LiabilityCategory);
		}
		if (values.imageUrl !== undefined) setImageUrl(values.imageUrl);
	};

	const { suggestions, matchedItem, handleQueryChange, applySuggestion, markTouched, resetTouched } =
		useCatalogAutofill({
			type: "liability",
			currency,
			onApplyAutofill,
		});

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setCategory(initialData.category);
			setImageUrl(initialData.imageUrl || "");
			setNotes(initialData.notes || "");
			setStartMonth(initialData.startMonth || currentMonth);
			setEndMonth(initialData.endMonth || "");
			markTouched("amount");
			markTouched("category");
			markTouched("imageUrl");
		} else {
			setName("");
			setAmount("");
			setCategory(isPersonal ? "mortgage" : "business_loan");
			setImageUrl("");
			setNotes("");
			setStartMonth(currentMonth);
			setEndMonth("");
			resetTouched();
		}
	}, [initialData, isOpen, isPersonal, currentMonth, markTouched, resetTouched]);

	if (!isOpen) return null;

	const handleNameChange = (val: string) => {
		setName(val);
		handleQueryChange(val, { amount, category, imageUrl });
	};

	const handleAmountChange = (val: string) => {
		markTouched("amount");
		setAmount(val);
	};

	const handleCategoryChange = (val: LiabilityCategory) => {
		markTouched("category");
		setCategory(val);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		if (initialData) {
			updateLiability({
				...initialData,
				name: name.trim(),
				amount: num,
				category,
				startMonth,
				endMonth: endMonth || undefined,
				imageUrl: imageUrl || undefined,
				notes: notes.trim() || undefined,
			});
		} else {
			addLiability({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				category,
				active: true,
				startMonth,
				endMonth: endMonth || undefined,
				imageUrl: imageUrl || undefined,
				notes: notes.trim() || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove liability "${initialData.name}"?`)) {
			deleteLiability(initialData.id);
			dismiss();
		}
	};

	// Every payment needs a start month; the end month is optional (open-ended)
	const canSubmit =
		name.trim().length > 0 && Number(amount) > 0 && Boolean(startMonth) && (!endMonth || endMonth >= startMonth);
	const isEditMode = Boolean(initialData);

	return (
		<ModalPage
			title={isEditMode ? "Edit Liability" : "Register Liability"}
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="liability-form"
						label={isEditMode ? "Save Liability" : "Register Liability"}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>

					{canSkip && !isEditMode && (
						<Button
							label="I don't have any liabilities or debts"
							variant="secondary"
							size="lg"
							width="100%"
							className="h-12"
							onClick={() => {
								onSkip?.();
								dismiss();
							}}
						/>
					)}

					{isEditMode && (
						<Button label="Delete Liability" size="lg" variant="destructive" width="100%" onClick={handleDelete} />
					)}
				</>
			}
		>
			<Text className="text-[13px] text-slate">
				Recurring debt payment charged monthly against <strong>{activeAccount.name}</strong>. Counted into the run rate.
			</Text>

			<ModalImageSection
				value={imageUrl}
				onChange={(v) => setImageUrl(v ?? "")}
				onUserTouched={() => markTouched("imageUrl")}
			/>

			<Stack as="form" id="liability-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Type"
					value={category}
					onChange={(e) => handleCategoryChange(e.target.value as LiabilityCategory)}
					autoFocus={!isEditMode}
				>
					{typeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</SelectField>

				<Stack gap={1.5} width="100%">
					<InputField
						label="Liability Name"
						placeholder={
							isPersonal ? "e.g. Home Mortgage, Auto Loan, Credit Card" : "e.g. Studio Equipment Loan, Credit Line"
						}
						value={name}
						onChange={(e) => handleNameChange(e.target.value)}
						required
					/>

					{/* Quick Debt Suggestions */}
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

				<FormField label={`Monthly Payment (${currency})`}>
					<CurrencyInput placeholder="0.00" value={amount} onChange={handleAmountChange} />
				</FormField>

				<HStack wrap="wrap" gap={2} width="100%">
					<InputField
						fieldClassName="flex-1 basis-[150px]"
						label="Start Month"
						type="month"
						value={startMonth}
						onChange={(e) => setStartMonth(e.target.value)}
						required
					/>
					<InputField
						fieldClassName="flex-1 basis-[150px]"
						label="End Month (Optional)"
						type="month"
						value={endMonth}
						min={startMonth || undefined}
						onChange={(e) => setEndMonth(e.target.value)}
					/>
				</HStack>

				<InputField
					label="Notes (Optional)"
					placeholder="e.g. 3.2% interest, ends 2028"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>
			</Stack>
		</ModalPage>
	);
};
