import React, { useState, useEffect } from "react";
import { NativeInput } from "@excited-live/design-system";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { FIELD_CLASS, FormField, InputField } from "../../../../components/FormField";
import { ModalPage } from "../../../../components/ModalPage";
import { AutofillBanner, SuggestionChips } from "../../../../components/AutofillHints";
import { CurrencyInput } from "../../../../components/CurrencyInput";
import { resolveCatalogAmount } from "@excited-live/accounting";
import { ModalImageSection } from "../../../../components/ModalImageSection";
import { useModalBack } from "../../../../hooks/useModalBack";
import { useAppUI, useFinances } from "../../../../state";
import { useCatalogAutofill, type AutofillValues } from "../../../../hooks/useCatalogAutofill";

export const CareerDrawer: React.FC<{
	isOpen: boolean;
	onClose: () => void;
}> = ({ isOpen, onClose }) => {
	const { accounts, revenues, setCareerIncome } = useFinances();
	const { today } = useAppUI();
	const currentMonth = today.slice(0, 7);
	const personal = accounts.find((a) => a.type === "personal") || accounts[0]!;
	const currency = personal.currency || "THB";

	const { dismiss } = useModalBack(isOpen, onClose);

	// The current career is the earliest-starting salary stream; a projected
	// promotion is a later-dated salary stream and must not be edited here.
	const careerRev = revenues
		.filter((r) => r.entityId === personal.id && (r.source === "salary" || r.id === "rev_career_prame"))
		.sort((a, b) => (a.startMonth ?? "").localeCompare(b.startMonth ?? ""))[0];

	const [company, setCompany] = useState("");
	const [title, setTitle] = useState("");
	const [salary, setSalary] = useState("");
	const [payday, setPayday] = useState("28");
	const [startMonth, setStartMonth] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [coverImageUrl, setCoverImageUrl] = useState("");

	const { markTouched, resetTouched, suggestions, matchedItem, applySuggestion, handleQueryChange } =
		useCatalogAutofill({
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
			setStartMonth(careerRev?.startMonth || currentMonth);
			setEndMonth(careerRev?.endMonth || "");
			setCoverImageUrl(personal.careerImageUrl || "");
			resetTouched();
			if (personal.salary) markTouched("amount");
			if (personal.careerImageUrl) markTouched("imageUrl");
		}
	}, [isOpen, personal, careerRev, currentMonth, markTouched, resetTouched]);

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
			startMonth,
			endMonth || undefined,
		);
		dismiss();
	};

	// Salary needs a start month; the end month is optional (open-ended)
	const canSubmit = Number(salary) > 0 && Boolean(startMonth) && (!endMonth || endMonth >= startMonth);

	return (
		<ModalPage
			title="Career & Salary"
			onClose={dismiss}
			footer={
				<>
					<Button
						type="submit"
						form="career-form"
						label="Save Career Income"
						size="lg"
						variant="primary"
						width="100%"
						className="h-12"
						isDisabled={!canSubmit}
					/>
				</>
			}
		>
			<Text className="text-[13px] text-slate">
				Configure your employer and salary. The company cover image will serve as the hero background on your management
				page.
			</Text>

			<Stack as="form" id="career-form" gap={4} width="100%" onSubmit={handleSubmit}>
				{/* Company / Office Hero Background */}
				<FormField label="Company / Office Cover Photo">
					<ModalImageSection
						value={coverImageUrl}
						onChange={handleCoverChange}
						onUserTouched={() => markTouched("imageUrl")}
						emptyLabel="Add Company Cover Image"
						aspectRatio="cover"
						showCuratedWallpapers={true}
					/>
				</FormField>

				<FormField label="Company / Employer">
					<NativeInput
						className={FIELD_CLASS}
						placeholder="e.g. Agoda, LINE MAN Wongnai, Bitkub, KBTG"
						value={company}
						onChange={(e) => handleCompanyChange(e.target.value)}
					/>

					{/* Quick Company Suggestions */}
					{suggestions.length > 0 && (
						<SuggestionChips
							suggestions={suggestions.slice(0, 5)}
							onPick={(s) => {
								setCompany(s.name);
								applySuggestion(s as (typeof suggestions)[number]);
							}}
							renderMeta={(s) => {
								const benchmark = resolveCatalogAmount(s as (typeof suggestions)[number], currency);
								if (benchmark === undefined) return null;
								return currency === "USD" ? `$${benchmark}` : `฿${benchmark.toLocaleString()}`;
							}}
						/>
					)}

					{/* Matched Banner */}
					{matchedItem && (
						<AutofillBanner badge="Company Found">
							{matchedItem.name} {matchedItem.notes ? `• ${matchedItem.notes}` : ""}
						</AutofillBanner>
					)}
				</FormField>

				<InputField
					label="Job Title / Role"
					placeholder="e.g. Senior Software Engineer, Design Lead"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>

				<FormField label={<>Monthly Salary ({currency})</>}>
					<CurrencyInput placeholder="0.00" value={salary} onChange={handleSalaryChange} required />
				</FormField>

				<InputField
					label="Payday (Day of Month)"
					type="number"
					inputMode="numeric"
					min={1}
					max={31}
					placeholder="28"
					value={payday}
					onChange={(e) => setPayday(e.target.value)}
					required
				/>

				<HStack wrap="wrap" gap={3} width="100%">
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
			</Stack>
		</ModalPage>
	);
};
