import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { FormField, InputField, SelectField } from "../FormField";
import { ModalPage } from "../ModalPage";
import { CurrencyInput } from "../CurrencyInput";
import type { RevenueStream } from "@excited-live/accounting";
import { ModalImageSection } from "../ModalImageSection";
import { useModalBack } from "../../hooks/useModalBack";
import { useBiz } from "../../state";

export const AddRevenueDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RevenueStream | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { activeEntityId, addRevenue, updateRevenue, deleteRevenue, accounts, setCareerIncome } = useBiz();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [frequency, setFrequency] = useState<"monthly" | "yearly" | "one_time">("monthly");
	const [source, setSource] = useState<"stripe" | "bank_transfer" | "cash" | "freelance" | "salary" | "other">(
		isPersonal ? "freelance" : "stripe",
	);
	const [startMonth, setStartMonth] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setFrequency(initialData.frequency);
			setSource(initialData.source);
			setStartMonth(initialData.startMonth || "");
			setEndMonth(initialData.endMonth || "");
			setNotes(initialData.notes || "");
			setImageUrl(initialData.imageUrl || "");
		} else {
			setName("");
			setAmount("");
			setFrequency("monthly");
			setSource(isPersonal ? "freelance" : "stripe");
			setStartMonth("");
			setEndMonth("");
			setNotes("");
			setImageUrl("");
		}
	}, [initialData, isOpen, isPersonal]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		const payload = {
			name: name.trim(),
			amount: num,
			frequency,
			source,
			startMonth: startMonth || undefined,
			endMonth: endMonth || undefined,
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

		if (source === "salary" && isPersonal) {
			setCareerIncome(
				activeEntityId,
				num,
				28,
				name.trim(),
				notes.trim() || undefined,
				imageUrl || undefined,
				startMonth || undefined,
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

	const canSubmit = name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);
	// A personal salary stream IS the career (title/company/payday live on the account).
	const isCareer = isPersonal && source === "salary";

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
				aspectRatio={isCareer ? "cover" : "square"}
				showCuratedWallpapers={isCareer}
			/>

			<Stack as="form" id="revenue-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Source Channel"
					value={source}
					onChange={(e) => setSource(e.target.value as typeof source)}
					autoFocus={!isEditMode}
				>
					{sourceOptions.map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</SelectField>

				<InputField
					label="Stream / Client Name"
					placeholder={isPersonal ? "e.g. Freelance Project, Side Income" : "e.g. Acme Corp Retainer, Stripe MRR"}
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<FormField label="Amount (THB)">
					<CurrencyInput placeholder="0.00" value={amount} onChange={setAmount} required />
				</FormField>

				<SelectField
					label="Frequency"
					value={frequency}
					onChange={(e) => setFrequency(e.target.value as typeof frequency)}
				>
					<option value="monthly">Monthly</option>
					<option value="yearly">Yearly</option>
					<option value="one_time">One-time</option>
				</SelectField>

				<HStack wrap="wrap" gap={2} width="100%">
					<InputField
						fieldClassName="flex-1 basis-[150px]"
						label="Start Month"
						type="month"
						value={startMonth}
						onChange={(e) => setStartMonth(e.target.value)}
					/>
					<InputField
						fieldClassName="flex-1 basis-[150px]"
						label="End Month"
						type="month"
						value={endMonth}
						onChange={(e) => setEndMonth(e.target.value)}
					/>
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
