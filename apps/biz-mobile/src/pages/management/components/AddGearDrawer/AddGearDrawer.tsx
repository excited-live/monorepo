import React, { useState, useEffect } from "react";
import { NativeInput } from "@excited-live/design-system";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FIELD_CLASS, FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { ChipButton } from "../../../../components/ChipButton";
import { SectionCard } from "../../../../components/SectionCard";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import type { HardwareAsset } from "@excited-live/accounting";
import { ModalImageSection } from "../../../../components/ModalImageSection";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useFinances, useAppUI } from "../../../../state";
import { formatMoney } from "../../../../utils/format";

export const AddGearDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: HardwareAsset | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { addHardware, updateHardware, deleteHardware, hardware } = useFinances();
	const { activeEntityId, selectedMonth } = useAppUI();

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
			const isCashItem = initialData.category === "cash" || initialData.lifespanMonths <= 0;
			setPurchaseDate(
				initialData.purchaseDate === "Historical"
					? "2024-01"
					: isCashItem && initialData.purchaseDate < selectedMonth
						? selectedMonth
						: initialData.purchaseDate,
			);
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

	// `initialData` can be a locally proposed placeholder (the default wallet
	// fabricated by the onboarding flow) that does not exist server-side yet.
	// Only treat it as editable state when the loaded snapshot really has it;
	// otherwise saving must create the asset (POST), not update it (PUT).
	const existingAsset =
		initialData && hardware.some((h) => h.id === initialData.id) ? initialData : null;

	if (!isOpen) return null;

	const isCash = category === "cash";

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const numCost = Number(cost);
		const numLife = isCash ? 0 : Number(lifespanMonths);
		if (!name.trim() || !numCost) return;
		if (!isCash && !numLife) return;

		if (existingAsset) {
			updateHardware({
				...existingAsset,
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
				id: initialData?.id,
				entityId: initialData?.entityId ?? activeEntityId,
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
		if (!existingAsset) return;
		if (confirm(`Remove asset "${existingAsset.name}"?`)) {
			deleteHardware(existingAsset.id);
			dismiss();
		}
	};

	const numCost = Number(cost) || 0;
	const numLife = Math.max(1, Number(lifespanMonths) || 1);
	const monthlyRate = Math.round(numCost / numLife);
	const canSubmit = name.trim().length > 0 && numCost > 0;
	const isEditMode = Boolean(existingAsset);
	const assetNoun = isCash ? "Cash Asset" : "Hardware Asset";

	return (
		<ModalPage
			title={isEditMode ? `Edit ${assetNoun}` : `Add ${assetNoun}`}
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="gear-form"
						label={isEditMode ? "Save Asset" : "Add Asset"}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>

					{isEditMode && (
						<Button label="Delete Asset" size="lg" variant="destructive" width="100%" onClick={handleDelete} />
					)}
				</>
			}
		>
			<ModalImageSection value={imageUrl} onChange={(v) => setImageUrl(v ?? "")} />

			<Stack as="form" id="gear-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Asset Type"
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
				</SelectField>

				<InputField
					label={isCash ? "Account / Reserve Name" : "Asset Name"}
					placeholder={
						isCash ? "e.g. Kasikorn Savings, Main Operating Account" : "e.g. MacBook Pro M3 Max, Herman Miller Chair"
					}
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>

				<FormField label={isCash ? "Balance (THB)" : "Purchase Cost (THB)"}>
					<CurrencyInput placeholder="0.00" value={cost} onChange={setCost} required />
				</FormField>

				<InputField
					label={isCash ? "As-of Date (Month)" : "Purchase Date (Month)"}
					type="month"
					value={purchaseDate}
					onChange={(e) => setPurchaseDate(e.target.value)}
					required
				/>

				{isCash && (
					<CheckboxInput
						label="Default Operating Wallet"
						description="Absorbs net operating cashflow (income minus expenses) and untargeted transfers."
						value={isDefault}
						onChange={setIsDefault}
					/>
				)}

				{!isCash && (
					<FormField label="Useful Lifespan (Months)">
						<HStack gap={1.5} wrap="wrap" className="mb-1.5">
							{[12, 24, 36, 48, 60].map((m) => (
								<ChipButton
									key={m}
									className={`rounded-md text-[12px] font-normal ${
										lifespanMonths === String(m) ? "!border-signal !bg-signal/10" : "!bg-transparent"
									}`}
									onClick={() => setLifespanMonths(String(m))}
								>
									{m}m ({m / 12}y)
								</ChipButton>
							))}
						</HStack>
						<NativeInput
							className={FIELD_CLASS}
							type="number"
							min={1}
							max={240}
							value={lifespanMonths}
							onChange={(e) => setLifespanMonths(e.target.value)}
							placeholder="36"
							required
						/>
					</FormField>
				)}

				{/* Depreciation Preview Card — cash holds full value instead */}
				{isCash ? (
					<SectionCard title="Cash & Equivalents" tint="bg-[#059669]/[0.08]">
						<Text className="text-[20px] font-bold">฿ {formatMoney(numCost)}</Text>
						<Text className="text-[12px] text-slate">
							Held at full value — no depreciation. Counts as liquid in the hero balance.
						</Text>
					</SectionCard>
				) : (
					<SectionCard title="Estimated Monthly Non-Cash Charge" tint="bg-ink/[0.03]">
						<Text className="text-[20px] font-bold">-฿ {formatMoney(monthlyRate)} / month</Text>
						<Text className="text-[12px] text-slate">Depreciated straight-line over {lifespanMonths} months.</Text>
					</SectionCard>
				)}
			</Stack>
		</ModalPage>
	);
};
