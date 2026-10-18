import { useState } from "react"
import { PlainButton } from "@excited-live/design-system"
import { Button } from "@astryxdesign/core/Button"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { HStack } from "@astryxdesign/core/HStack"
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout"
import { NumberInput } from "@astryxdesign/core/NumberInput"
import { Selector } from "@astryxdesign/core/Selector"
import { Stack } from "@astryxdesign/core/Stack"
import { TextInput } from "@astryxdesign/core/TextInput"
import {
	ASSET_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	type AssetRow,
	type AssetTypeId,
	type LiabilityRow,
	type LiabilityTypeId,
	type PlanInput,
} from "../../../lib/plan-service"

export type ValueDialogDescriptor =
	| {
			mode: "add"
			kind: "assets" | "liabilities"
			typeId?: AssetTypeId | LiabilityTypeId
			lockType?: boolean
	  }
	| { mode: "edit"; kind: "assets" | "liabilities"; rowId: string }

export interface ValueDialogProps {
	dialog: ValueDialogDescriptor
	plan: PlanInput
	onSave: (values: {
		typeId?: AssetTypeId | LiabilityTypeId
		label: string
		value: number
	}) => void
	onRemove: (id: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function ValueDialog({
	dialog,
	plan,
	onSave,
	onRemove,
	onClose,
	t,
}: ValueDialogProps) {
	const catalog = dialog.kind === "assets" ? ASSET_TYPE_IDS : LIABILITY_TYPE_IDS
	const existingRow =
		dialog.mode === "edit"
			? (plan[dialog.kind] as Array<AssetRow | LiabilityRow>).find(
					(r) => r.id === dialog.rowId,
				)
			: null

	const initialTypeId =
		dialog.mode === "edit"
			? (existingRow?.typeId ?? (dialog.kind === "assets" ? "stock" : "debt"))
			: (dialog.typeId ?? (dialog.kind === "assets" ? "stock" : "debt"))

	const [typeId, setTypeId] = useState<AssetTypeId | LiabilityTypeId>(
		initialTypeId as AssetTypeId | LiabilityTypeId,
	)
	const isTypeLocked = dialog.mode === "add" ? Boolean(dialog.lockType) : true

	const typeLabel = t(`type.${typeId}`)
	const [label, setLabel] = useState(
		dialog.mode === "edit" ? (existingRow?.label ?? "") : t(`type.${initialTypeId}`),
	)
	const [value, setValue] = useState(
		dialog.mode === "edit" ? (existingRow?.value ?? 0) : 0,
	)

	const handleTypeChange = (newTypeId: string) => {
		const oldTypeLabel = t(`type.${typeId}`)
		const typedId = newTypeId as AssetTypeId | LiabilityTypeId
		setTypeId(typedId)
		if (label === oldTypeLabel || label === "") {
			setLabel(t(`type.${newTypeId}`))
		}
	}

	const title =
		dialog.mode === "add"
			? t("dialog.addItem", { label: typeLabel })
			: t("dialog.editItem", { label: typeLabel })

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="form"
			width={520}
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
						<Stack gap={1.5}>
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
								label={t("table.value")}
								value={value}
								onChange={(v) => setValue(v ?? 0)}
								min={0}
								step={1000}
								units="฿"
							/>
						</Stack>
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
										value,
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
