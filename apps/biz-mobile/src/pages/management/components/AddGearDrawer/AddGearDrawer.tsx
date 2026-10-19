import React, { useState, useEffect, useRef } from "react";
import { NativeInput } from "@excited-live/design-system";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FIELD_CLASS, FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { AutofillBanner, SuggestionChips } from "../../../../components/AutofillHints";
import { ChipButton } from "../../../../components/ChipButton";
import { SectionCard } from "../../../../components/SectionCard";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import { resolveCatalogAmount, type HardwareAsset } from "@excited-live/accounting";
import { ModalImageSection } from "../../../../components/ModalImageSection";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useCatalogAutofill, type AutofillValues } from "../../../../hooks/useCatalogAutofill";
import { useFinances, useAppUI } from "../../../../state";
import { formatMoney } from "../../../../utils/format";

const HARDWARE_CATEGORIES = ["workstation", "mobile", "audio", "furniture", "other"];

export const AddGearDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: HardwareAsset | null;
}> = ({ isOpen, onClose, initialData }) => {
	const { addHardware, updateHardware, deleteHardware, hardware, accounts } = useFinances();
	const { activeEntityId, selectedMonth, today } = useAppUI();

	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const currency = activeAccount?.currency || "THB";

	const { dismiss } = useModalBack(isOpen, onClose);

	const [name, setName] = useState("");
	const [cost, setCost] = useState("");
	const [lifespanMonths, setLifespanMonths] = useState("36");
	const [purchaseDate, setPurchaseDate] = useState(selectedMonth);
	const [category, setCategory] = useState("workstation");
	const [imageUrl, setImageUrl] = useState("");
	const [isDefault, setIsDefault] = useState(false);
	// A cash balance is true "as of" a day. Re-date it to today only when the user
	// types a new balance, never silently (that would drop the movements between).
	const [isAsOfTouched, setIsAsOfTouched] = useState(false);

	// A pending catalog lookup can resolve after the user switched to cash; the
	// ref keeps the cash guard honest against that race.
	const categoryRef = useRef(category);
	categoryRef.current = category;

	// Smart catalog autofill with user-touch protection. Cash reserves are not
	// catalog items: never let a work-gear match overwrite a bank balance.
	const onApplyAutofill = (values: AutofillValues) => {
		if (categoryRef.current === "cash") return;
		if (values.amount !== undefined) setCost(String(values.amount));
		if (values.category && HARDWARE_CATEGORIES.includes(values.category)) setCategory(values.category);
		if (values.imageUrl !== undefined) setImageUrl(values.imageUrl);
	};

	const { suggestions, matchedItem, handleQueryChange, applySuggestion, markTouched, resetTouched } =
		useCatalogAutofill({
			type: "hardware",
			currency,
			onApplyAutofill,
		});

	useEffect(() => {
		if (initialData) {
			setName(initialData.name);
			setCost(String(initialData.cost));
			setLifespanMonths(String(initialData.lifespanMonths));
			const isCashItem = initialData.category === "cash" || initialData.lifespanMonths <= 0;
			const isDated = /^\d{4}-\d{2}/.test(initialData.purchaseDate);
			setPurchaseDate(isDated ? initialData.purchaseDate : isCashItem ? today : "2024-01");
			setCategory(initialData.category);
			setImageUrl(initialData.imageUrl || "");
			setIsDefault(Boolean(initialData.isDefault));
			markTouched("amount");
			markTouched("category");
			markTouched("imageUrl");
		} else {
			setName("");
			setCost("");
			setLifespanMonths("36");
			setPurchaseDate(selectedMonth);
			setCategory("workstation");
			setImageUrl("");
			setIsDefault(false);
			resetTouched();
		}
		setIsAsOfTouched(false);
	}, [initialData, isOpen, selectedMonth, today, markTouched, resetTouched]);

	// `initialData` can be a locally proposed placeholder (the default wallet
	// fabricated by the onboarding flow) that does not exist server-side yet.
	// Only treat it as editable state when the loaded snapshot really has it;
	// otherwise saving must create the asset (POST), not update it (PUT).
	const existingAsset =
		initialData && hardware.some((h) => h.id === initialData.id) ? initialData : null;

	if (!isOpen) return null;

	const isCash = category === "cash";

	const handleNameChange = (val: string) => {
		setName(val);
		handleQueryChange(val, { amount: cost, category, imageUrl });
	};

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
				purchaseDate: isCash ? purchaseDate : purchaseDate.slice(0, 7),
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
				purchaseDate: isCash ? purchaseDate : purchaseDate.slice(0, 7),
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
			<ModalImageSection
				value={imageUrl}
				onChange={(v) => setImageUrl(v ?? "")}
				onUserTouched={() => markTouched("imageUrl")}
			/>

			<Stack as="form" id="gear-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Asset Type"
					value={category}
					onChange={(e) => {
						const next = e.target.value;
						markTouched("category");
						setCategory(next);
						// A new cash balance is what's in the bank now
						if (next === "cash" && !initialData && !isAsOfTouched) setPurchaseDate(today);
						if (next === "cash") handleQueryChange("");
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

				<Stack gap={1.5} width="100%">
					<InputField
						label={isCash ? "Account / Reserve Name" : "Asset Name"}
						placeholder={
							isCash ? "e.g. Kasikorn Savings, Main Operating Account" : "e.g. MacBook Pro M3 Max, Herman Miller Chair"
						}
						value={name}
						onChange={(e) => handleNameChange(e.target.value)}
						required
					/>

					{/* Quick Work Gear Suggestions */}
					{!isCash && suggestions.length > 0 && (
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
					{!isCash && matchedItem && (
						<AutofillBanner badge="Auto-Filled">
							{matchedItem.name} {matchedItem.notes ? `• ${matchedItem.notes}` : ""}
						</AutofillBanner>
					)}
				</Stack>

				<FormField label={isCash ? `Balance (${currency})` : `Purchase Cost (${currency})`}>
					<CurrencyInput
						placeholder="0.00"
						value={cost}
						onChange={(v) => {
							markTouched("amount");
							setCost(v);
							if (isCash && !isAsOfTouched) setPurchaseDate(today);
						}}
						required
					/>
				</FormField>

				<InputField
					label={isCash ? "Balance As-of Date" : "Purchase Date (Month)"}
					type={isCash ? "date" : "month"}
					// A month-only as-of means the start of that month (the 1st)
					value={isCash ? (purchaseDate.length === 7 ? `${purchaseDate}-01` : purchaseDate) : purchaseDate.slice(0, 7)}
					onChange={(e) => {
						setIsAsOfTouched(true);
						setPurchaseDate(e.target.value);
					}}
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
