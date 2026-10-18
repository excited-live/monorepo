import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import type { LiabilityCategory, LiabilityStream } from "@excited-live/accounting";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useFinances, useAppUI } from "../../../../state";

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
	const { activeEntityId } = useAppUI();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory: LiabilityCategory = isPersonal ? "mortgage" : "business_loan";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<LiabilityCategory>(defaultCategory);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setCategory(initialData.category);
			setNotes(initialData.notes || "");
		} else {
			setName("");
			setAmount("");
			setCategory(isPersonal ? "mortgage" : "business_loan");
			setNotes("");
		}
	}, [initialData, isOpen, isPersonal]);

	if (!isOpen) return null;

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
				notes: notes.trim() || undefined,
			});
		} else {
			addLiability({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				category,
				active: true,
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

	const canSubmit = name.trim().length > 0 && Number(amount) > 0;
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

			<Stack as="form" id="liability-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Type"
					value={category}
					onChange={(e) => setCategory(e.target.value as LiabilityCategory)}
					autoFocus={!isEditMode}
				>
					{isPersonal ? (
						<>
							<option value="mortgage">Home Mortgage / Housing Debt</option>
							<option value="car_loan">Auto / Vehicle Loan</option>
							<option value="student_loan">Student / Education Loan</option>
							<option value="credit_card">Credit Card Minimum / Personal Loan</option>
							<option value="other">Other Personal Debt</option>
						</>
					) : (
						<>
							<option value="business_loan">Business Loan</option>
							<option value="equipment_loan">Equipment Loan / Financing</option>
							<option value="credit_line">Credit Line Repayment</option>
							<option value="lease">Commercial Lease / Rental</option>
							<option value="other">Other Business Recurring Debt</option>
						</>
					)}
				</SelectField>

				<InputField
					label="Liability Name"
					placeholder={
						isPersonal ? "e.g. Home Mortgage, Auto Loan, Credit Card" : "e.g. Studio Equipment Loan, Credit Line"
					}
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<FormField label="Monthly Payment (THB)">
					<CurrencyInput placeholder="0.00" value={amount} onChange={setAmount} />
				</FormField>

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
