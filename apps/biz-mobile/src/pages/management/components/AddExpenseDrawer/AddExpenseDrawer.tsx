import React, { useState, useEffect } from "react";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FormField, InputField, SelectField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { AutofillBanner, SuggestionChips } from "../../../../components/AutofillHints";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import { isCashAsset, resolveCatalogAmount, type BillingCycle, type RecurringSubscription } from "@excited-live/accounting";
import { formatMoney } from "../../../../utils/format";
import { selectEntityCurrentLiquid } from "../../../../domain/selectors";
import { ModalImageSection } from "../../../../components/ModalImageSection";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useFinances, useAppUI } from "../../../../state";
import { useCatalogAutofill, type AutofillValues } from "../../../../hooks/useCatalogAutofill";

const PERSONAL_CATEGORIES = [
	{ value: "housing", label: "Housing & Rent" },
	{ value: "food", label: "Food & Dining" },
	{ value: "groceries", label: "Groceries & Household" },
	{ value: "transit", label: "Transit & Transport" },
	{ value: "healthcare", label: "Healthcare & Wellness" },
	{ value: "entertainment", label: "Subscriptions & Living" },
	{ value: "connectivity", label: "Internet & Mobile" },
	{ value: "family", label: "Family & Personal" },
	{ value: "capital_deploy", label: "Deploy Capital to Business" },
	{ value: "dev_tool", label: "Developer Tools & AI" },
	{ value: "other", label: "Other Personal Outflow" },
];

const BUSINESS_CATEGORIES = [
	{ value: "dev_tool", label: "Developer Tools & APIs" },
	{ value: "ai", label: "AI Subscriptions" },
	{ value: "saas", label: "SaaS & Productivity" },
	{ value: "infrastructure", label: "Hosting & Infrastructure" },
	{ value: "transit", label: "Transit & Transport" },
	{ value: "connectivity", label: "Internet & Mobile" },
	{ value: "office", label: "Office & Workspace" },
	{ value: "marketing", label: "Marketing & Sales" },
	{ value: "other", label: "Other Business Outflow" },
];

export const AddExpenseDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
	initialData?: RecurringSubscription | null;
}> = ({ isOpen, onClose, initialData }) => {
	const {
		addSubscription,
		updateSubscription,
		deleteSubscription,
		accounts,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
		injectCapital,
	} = useFinances();
	const { activeEntityId } = useAppUI();
	const activeAccount = accounts.find((a) => a.id === activeEntityId) || accounts[0]!;
	const isPersonal = activeAccount.type === "personal";
	const businessAccounts = accounts.filter((a) => a.type === "business");
	const currency = activeAccount.currency || "THB";

	const { dismiss } = useModalBack(isOpen, onClose);

	const defaultCategory = isPersonal ? "housing" : "dev_tool";
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [cycle, setCycle] = useState<BillingCycle>("monthly");
	const [category, setCategory] = useState(defaultCategory);
	const [targetBizId, setTargetBizId] = useState(businessAccounts[0]?.id || "");
	const [renewalDate, setRenewalDate] = useState("2026-11-01");
	const [notes, setNotes] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [targetAssetId, setTargetAssetId] = useState("");
	const [frequency, setFrequency] = useState<"one_time" | "monthly">("one_time");

	const targetBiz = accounts.find((a) => a.id === targetBizId) || businessAccounts[0];
	const targetBizCashAssets = targetBiz ? hardware.filter((h) => h.entityId === targetBiz.id && isCashAsset(h)) : [];
	const availablePersonalCash = selectEntityCurrentLiquid({
		account: activeAccount,
		hardware,
		subscriptions,
		revenues,
		liabilities,
		transfers,
	});

	const handleTargetBizChange = (newBizId: string) => {
		setTargetBizId(newBizId);
		const cashHw = hardware.filter((h) => h.entityId === newBizId && isCashAsset(h));
		setTargetAssetId(cashHw[0]?.id || "primary_cash");
	};

	// Smart catalog autofill with user-touch protection
	const onApplyAutofill = (values: AutofillValues) => {
		if (values.amount !== undefined) setAmount(String(values.amount));
		if (values.cycle !== undefined) setCycle(values.cycle as BillingCycle);
		if (values.category !== undefined) setCategory(values.category);
		if (values.imageUrl !== undefined) setImageUrl(values.imageUrl);
	};

	const { suggestions, matchedItem, handleQueryChange, applySuggestion, markTouched, resetTouched } =
		useCatalogAutofill({
			type: "subscription",
			currency,
			onApplyAutofill,
		});

	const firstBizId = businessAccounts[0]?.id || "";

	useEffect(() => {
		if (!isOpen) return;
		if (initialData) {
			setName(initialData.name);
			setAmount(String(initialData.amount));
			setCycle(initialData.cycle);
			setCategory(initialData.category);
			setRenewalDate(initialData.nextRenewalDate);
			setNotes(initialData.notes || "");
			setImageUrl(initialData.imageUrl || "");
			markTouched("amount");
			markTouched("cycle");
			markTouched("category");
			markTouched("imageUrl");
		} else {
			setName("");
			setAmount("");
			setCycle("monthly");
			setCategory(isPersonal ? "housing" : "dev_tool");
			setRenewalDate("2026-11-01");
			setNotes("");
			setImageUrl("");
			if (firstBizId) {
				setTargetBizId(firstBizId);
				const cashHw = hardware.filter((h) => h.entityId === firstBizId && isCashAsset(h));
				setTargetAssetId(cashHw[0]?.id || "primary_cash");
			}
			setFrequency("one_time");
			resetTouched();
		}
	}, [initialData, isOpen, isPersonal, firstBizId, hardware, markTouched, resetTouched]);

	if (!isOpen) return null;

	const handleNameChange = (val: string) => {
		setName(val);
		handleQueryChange(val, { amount, cycle, category, imageUrl });
	};

	const handleAmountChange = (val: string) => {
		markTouched("amount");
		setAmount(val);
	};

	const handleCycleChange = (val: BillingCycle) => {
		markTouched("cycle");
		setCycle(val);
	};

	const handleCategoryChange = (val: string) => {
		markTouched("category");
		setCategory(val);
	};

	const handleImageChange = (val: string | undefined) => {
		setImageUrl(val ?? "");
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const num = Number(amount);
		if (!name.trim() || !num) return;

		if (category === "capital_deploy" && isPersonal) {
			const resolvedAssetId = targetAssetId === "primary_cash" ? undefined : targetAssetId || undefined;
			injectCapital(
				activeEntityId,
				targetBizId || (businessAccounts[0]?.id ?? ""),
				num,
				name.trim() || "Founder seed capital",
				frequency === "monthly" ? "monthly" : "one_time",
				resolvedAssetId,
			);
			dismiss();
			return;
		}

		if (initialData) {
			updateSubscription({
				...initialData,
				name: name.trim(),
				amount: num,
				cycle,
				category,
				nextRenewalDate: renewalDate,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		} else {
			addSubscription({
				entityId: activeEntityId,
				name: name.trim(),
				amount: num,
				cycle,
				category,
				nextRenewalDate: renewalDate,
				active: true,
				notes: notes.trim() || undefined,
				imageUrl: imageUrl || undefined,
			});
		}

		dismiss();
	};

	const handleDelete = () => {
		if (!initialData) return;
		if (confirm(`Remove subscription "${initialData.name}"?`)) {
			deleteSubscription(initialData.id);
			dismiss();
		}
	};

	const isDeploy = category === "capital_deploy" && isPersonal;
	const canSubmit = isDeploy
		? Number(amount) > 0 && Number(amount) <= availablePersonalCash
		: name.trim().length > 0 && Number(amount) > 0;
	const isEditMode = Boolean(initialData);

	return (
		<ModalPage
			title={isEditMode ? "Edit Outflow / Expense" : "Add Outflow / Expense"}
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="expense-form"
						label={isDeploy ? "Confirm Capital Injection" : isEditMode ? "Save Changes" : "Add Expense"}
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>
					{isEditMode && (
						<Button label="Delete Expense" size="lg" variant="destructive" width="100%" onClick={handleDelete} />
					)}
				</>
			}
		>
			{!isDeploy && (
				<ModalImageSection
					value={imageUrl}
					onChange={handleImageChange}
					onUserTouched={() => markTouched("imageUrl")}
				/>
			)}

			<Stack as="form" id="expense-form" gap={4} width="100%" onSubmit={handleSubmit}>
				<SelectField
					label="Category"
					value={category}
					onChange={(e) => handleCategoryChange(e.target.value)}
					autoFocus={!isEditMode}
				>
					{(isPersonal ? PERSONAL_CATEGORIES : BUSINESS_CATEGORIES)
						.filter((c) => c.value !== "capital_deploy" || businessAccounts.length > 0)
						.map((c) => (
							<option key={c.value} value={c.value}>
								{c.label}
							</option>
						))}
				</SelectField>

				{isDeploy ? (
					<>
						<InputField
							label="Source Reserve"
							value={`Personal (Available: ฿${formatMoney(availablePersonalCash)})`}
							disabled
							readOnly
						/>

						<SelectField
							label="Recipient Business"
							value={targetBizId}
							onChange={(e) => handleTargetBizChange(e.target.value)}
						>
							{businessAccounts.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name}
								</option>
							))}
						</SelectField>

						<SelectField
							label="Target Cash Account / Asset"
							hint="Choose the specific cash account receiving this capital injection."
							value={targetAssetId}
							onChange={(e) => setTargetAssetId(e.target.value)}
						>
							{targetBizCashAssets.length > 0 ? (
								targetBizCashAssets.map((asset) => (
									<option key={asset.id} value={asset.id}>
										{asset.name} (Current: ฿{formatMoney(asset.cost)})
									</option>
								))
							) : (
								<option value="primary_cash">Primary Cash Account</option>
							)}
						</SelectField>

						<Stack gap={1.5} width="100%">
							<Text className="text-[12px] font-bold uppercase tracking-[0.04em] text-slate">Transfer Schedule</Text>
							<SegmentedControl
								label="Transfer Schedule"
								value={frequency}
								onChange={(v) => setFrequency(v as "one_time" | "monthly")}
							>
								<SegmentedControlItem value="one_time" label="One-Time Injection" />
								<SegmentedControlItem value="monthly" label="Monthly Recurring" />
							</SegmentedControl>
							<Text className="text-[11px] text-slate">
								{frequency === "monthly"
									? "Transfers automatically every month starting from selected month."
									: "One-off capital injection for this month only."}
							</Text>
						</Stack>

						<FormField label="Transfer Amount (THB)">
							<CurrencyInput placeholder="0.00" value={amount} onChange={handleAmountChange} required autoFocus />
						</FormField>

						<InputField
							label="Injection / Transfer Date"
							type="date"
							value={renewalDate}
							onChange={(e) => setRenewalDate(e.target.value)}
							required
						/>

						<InputField
							label="Transfer Reference / Note"
							placeholder="e.g. Founder seed capital, operational buffer"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</>
				) : (
					<>
						<Stack gap={1.5} width="100%">
							<InputField
								label="Service / Vendor Name"
								placeholder={
									isPersonal ? "e.g. opencode, ChatGPT, AIS Fibre, Netflix" : "e.g. opencode, Figma, Cursor, AWS"
								}
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
										const itemAmt = resolveCatalogAmount(s as (typeof suggestions)[number], currency);
										if (itemAmt === undefined) return null;
										return currency === "USD" ? `$${itemAmt}` : `฿${itemAmt.toLocaleString()}`;
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
							label="Payment Frequency"
							value={cycle}
							onChange={(e) => handleCycleChange(e.target.value as BillingCycle)}
						>
							<option value="one_time">One-Time Payment</option>
							<option value="monthly">Monthly</option>
							<option value="yearly">Yearly</option>
							<option value="quarterly">Quarterly</option>
							<option value="semi-annual">Semi-Annual</option>
							<option value="weekly">Weekly</option>
						</SelectField>

						<InputField
							label={cycle === "one_time" ? "Payment / Charge Date" : "Next Renewal / Charge Date"}
							type="date"
							value={renewalDate}
							onChange={(e) => setRenewalDate(e.target.value)}
							required
						/>

						<InputField
							label="Notes (Optional)"
							placeholder="e.g. Workspace license, tier 2"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
						/>
					</>
				)}
			</Stack>
		</ModalPage>
	);
};
