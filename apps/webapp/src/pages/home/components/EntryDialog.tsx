import { useState } from "react"
import { PlainButton } from "@excited-live/design-system"
import { Button } from "@astryxdesign/core/Button"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { Grid } from "@astryxdesign/core/Grid"
import { HStack } from "@astryxdesign/core/HStack"
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout"
import { NumberInput } from "@astryxdesign/core/NumberInput"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { Selector } from "@astryxdesign/core/Selector"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import {
	EXPENSE_TYPE_DEFAULT_FREQUENCY,
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_DEFAULT_FREQUENCY,
	INCOME_TYPE_IDS,
	type AmountFrequency,
	type ExpenseTypeId,
	type IncomeTypeId,
	type PeriodRow,
	type PlanInput,
} from "../../../lib/plan-service"
import { MonthYearPicker } from "./MonthYearPicker"

export type EntryDialogDescriptor =
	| {
			mode: "add"
			kind: "incomes" | "expenses"
			typeId?: IncomeTypeId | ExpenseTypeId
			lockType?: boolean
	  }
	| { mode: "edit"; kind: "incomes" | "expenses"; rowId: string }

export interface EntryDialogProps {
	dialog: EntryDialogDescriptor
	plan: PlanInput
	onSave: (values: {
		typeId?: IncomeTypeId | ExpenseTypeId
		label: string
		amount: number
		frequency: AmountFrequency
		startYear: number
		startMonth: number
		endYear: number | null
		endMonth: number
		growthMode: PeriodRow["growthMode"]
		growthRate: number
		deductible?: PeriodRow["deductible"]
	}) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function EntryDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: EntryDialogProps) {
	const catalog = dialog.kind === "incomes" ? INCOME_TYPE_IDS : EXPENSE_TYPE_IDS
	const existingRow =
		dialog.mode === "edit"
			? plan[dialog.kind].find((r) => r.id === dialog.rowId)
			: null

	const initialTypeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ??
				(dialog.kind === "incomes" ? "salary" : "livingExpenses"))
			: (dialog.typeId ??
				(dialog.kind === "incomes" ? "salary" : "livingExpenses"))

	const [typeId, setTypeId] = useState<IncomeTypeId | ExpenseTypeId>(
		initialTypeId as IncomeTypeId | ExpenseTypeId,
	)
	const isTypeLocked = dialog.mode === "add" ? Boolean(dialog.lockType) : true

	const defaultFreq =
		dialog.kind === "incomes"
			? (INCOME_TYPE_DEFAULT_FREQUENCY[typeId as IncomeTypeId] ?? "monthly")
			: (EXPENSE_TYPE_DEFAULT_FREQUENCY[typeId as ExpenseTypeId] ?? "monthly")

	const [label, setLabel] = useState(
		dialog.mode === "edit"
			? (existingRow?.label ?? "")
			: t(`type.${initialTypeId}`),
	)
	const [amount, setAmount] = useState(
		dialog.mode === "edit" ? (existingRow?.amount ?? 0) : 0,
	)
	const [frequency, setFrequency] = useState<AmountFrequency>(
		dialog.mode === "edit" ? (existingRow?.frequency ?? defaultFreq) : defaultFreq,
	)

	const now = new Date()
	const currentYear = now.getFullYear()
	const currentMonth = now.getMonth()

	const [startYear, setStartYear] = useState(
		dialog.mode === "edit"
			? (existingRow?.startYear ?? plan.startYear)
			: currentYear,
	)
	const [startMonth, setStartMonth] = useState(
		dialog.mode === "edit" ? (existingRow?.startMonth ?? 0) : currentMonth,
	)
	const [endYear, setEndYear] = useState<number | null>(
		dialog.mode === "edit" ? (existingRow?.endYear ?? null) : null,
	)
	const [endMonth, setEndMonth] = useState(
		dialog.mode === "edit" ? (existingRow?.endMonth ?? 11) : 11,
	)
	const [growthMode, setGrowthMode] = useState<PeriodRow["growthMode"]>(
		dialog.mode === "edit"
			? (existingRow?.growthMode ?? "inflation")
			: "inflation",
	)
	const [growthRate, setGrowthRate] = useState(
		dialog.mode === "edit" ? (existingRow?.growthRate ?? 0) : 0,
	)
	const [deductible, setDeductible] = useState<PeriodRow["deductible"]>(
		dialog.mode === "edit" ? (existingRow?.deductible ?? "none") : "none",
	)

	function handleTypeChange(nextId: string | null) {
		if (!nextId) return
		const typedId = nextId as IncomeTypeId | ExpenseTypeId
		setTypeId(typedId)
		// Auto-populate label if user hasn't edited it or if it matches the old type's label
		const oldLabel = t(`type.${typeId}`)
		if (!label || label === oldLabel) {
			setLabel(t(`type.${typedId}`))
		}
		// Reset frequency to type's default
		const nextDefaultFreq =
			dialog.kind === "incomes"
				? (INCOME_TYPE_DEFAULT_FREQUENCY[typedId as IncomeTypeId] ?? "monthly")
				: (EXPENSE_TYPE_DEFAULT_FREQUENCY[typedId as ExpenseTypeId] ?? "monthly")
		setFrequency(nextDefaultFreq)
	}

	const title =
		dialog.mode === "add"
			? t("dialog.addItem", { label: t(`type.${typeId}`) })
			: t("dialog.editItem", { label: label || t(`type.${typeId}`) })

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="form"
			width={640}
		>
			<Layout
				defaultHasDividers
				header={
					<DialogHeader
						title={title}
						hasDivider
						onOpenChange={() => onClose()}
					/>
				}
				content={
					<LayoutContent>
						<Grid columns={{ minWidth: 240, max: 2 }} gap={1.5}>
							<Selector
								label={t("table.type")}
								value={typeId}
								onChange={handleTypeChange}
								options={catalog.map((id) => ({
									value: id,
									label: t(`type.${id}`),
								}))}
								isDisabled={isTypeLocked}
							/>
							<TextInput
								label={t("row.label")}
								value={label}
								onChange={setLabel}
							/>
							<NumberInput
								label={t("row.amount")}
								value={amount}
								onChange={(v) => setAmount(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
							<Stack gap={0.5}>
								<Text size="sm" color="secondary">
									{t("row.frequency")}
								</Text>
								<SegmentedControl
									value={frequency}
									onChange={(v) => setFrequency(v as AmountFrequency)}
									label={t("row.frequency")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem
										value="monthly"
										label={t("freq.monthly")}
									/>
									<SegmentedControlItem
										value="yearly"
										label={t("freq.yearly")}
									/>
								</SegmentedControl>
							</Stack>
							<MonthYearPicker
								label={t("row.startYear")}
								year={startYear}
								month={startMonth}
								mode={frequency === "yearly" ? "year" : "month"}
								onChange={(y, m) => {
									if (y !== null) setStartYear(y)
									setStartMonth(m)
								}}
								t={t}
							/>
							<MonthYearPicker
								label={t("row.endYear")}
								year={endYear}
								month={endMonth}
								mode={frequency === "yearly" ? "year" : "month"}
								allowForever
								onChange={(y, m) => {
									setEndYear(y)
									setEndMonth(m)
								}}
								t={t}
							/>
							<Stack gap={1}>
								<Text size="sm" color="secondary">
									{t("row.growth")}
								</Text>
								<SegmentedControl
									value={growthMode}
									onChange={(v) => setGrowthMode(v as PeriodRow["growthMode"])}
									label={t("row.growth")}
									layout="fill"
									size="sm"
								>
									<SegmentedControlItem
										value="inflation"
										label={t("growth.inflation")}
									/>
									<SegmentedControlItem
										value="fixed"
										label={t("growth.fixed")}
									/>
									<SegmentedControlItem
										value="override"
										label={t("growth.override")}
									/>
								</SegmentedControl>
								{growthMode === "override" ? (
									<NumberInput
										label={t("row.growthRate")}
										value={growthRate * 100}
										onChange={(v) => setGrowthRate((v ?? 0) / 100)}
										min={-10}
										max={50}
										step={0.5}
										units="%"
									/>
								) : null}
							</Stack>
							{dialog.kind === "expenses" ? (
								<Stack gap={1}>
									<Text size="sm" color="secondary">
										{t("row.deductible")}
									</Text>
									<SegmentedControl
										value={deductible ?? "none"}
										onChange={(v) =>
											setDeductible(
												v === "mortgageInterest" ? "mortgageInterest" : "none",
											)
										}
										label={t("row.deductible")}
										layout="fill"
										size="sm"
									>
										<SegmentedControlItem
											value="none"
											label={t("deductible.none")}
										/>
										<SegmentedControlItem
											value="mortgageInterest"
											label={t("deductible.mortgageInterest")}
										/>
									</SegmentedControl>
								</Stack>
							) : null}
						</Grid>
					</LayoutContent>
				}
				footer={
					<LayoutFooter hasDivider>
						<HStack gap={2} hAlign="end">
							{dialog.mode === "edit" ? (
								<PlainButton onClick={() => onRemove(dialog.rowId)}>
									{t("row.remove")}
								</PlainButton>
							) : null}
							<Button
								label={t("dialog.cancel")}
								variant="secondary"
								onClick={onClose}
							/>
							<Button
								label={t("dialog.save")}
								variant="primary"
								onClick={() => {
									onSave({
										typeId,
										label: label.trim() || t(`type.${typeId}`),
										amount,
										frequency,
										startYear,
										startMonth,
										endYear,
										endMonth,
										growthMode,
										growthRate: growthMode === "override" ? growthRate : 0,
										deductible:
											dialog.kind === "expenses" ? deductible : undefined,
									})
								}}
							/>
						</HStack>
					</LayoutFooter>
				}
			/>
		</Dialog>
	)
}
