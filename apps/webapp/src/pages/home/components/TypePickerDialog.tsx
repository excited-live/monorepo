import { PlainButton } from "@excited-live/design-system"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { Layout, LayoutContent } from "@astryxdesign/core/Layout"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import {
	ASSET_TYPE_IDS,
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_IDS,
	LIABILITY_TYPE_IDS,
} from "../../../lib/plan-service"

export type TypePickerKind =
	| "incomes"
	| "expenses"
	| "assets"
	| "liabilities"

export interface TypePickerDialogProps {
	kind: TypePickerKind
	addedTypeIds: string[]
	onPick: (typeId: string) => void
	onClose: () => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function TypePickerDialog({
	kind,
	addedTypeIds,
	onPick,
	onClose,
	t,
}: TypePickerDialogProps) {
	const catalog =
		kind === "incomes"
			? INCOME_TYPE_IDS
			: kind === "expenses"
				? EXPENSE_TYPE_IDS
				: kind === "assets"
					? ASSET_TYPE_IDS
					: LIABILITY_TYPE_IDS

	const available = catalog.filter((id) => !addedTypeIds.includes(id))

	const titleKey =
		kind === "incomes"
			? "dialog.addType.income"
			: kind === "expenses"
				? "dialog.addType.expense"
				: kind === "assets"
					? "dialog.addType.asset"
					: "dialog.addType.liability"

	return (
		<Dialog
			isOpen
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			purpose="info"
			width={420}
		>
			<Layout
				header={
					<DialogHeader title={t(titleKey)} onOpenChange={() => onClose()} />
				}
				content={
					<LayoutContent>
						{available.length === 0 ? (
							<Text color="secondary">{t("dialog.allTypesAdded")}</Text>
						) : (
							<Stack className="dialog-options">
								{available.map((id) => (
									<PlainButton
										key={id}
										className="dialog-option"
										onClick={() => onPick(id)}
									>
										{t(`type.${id}`)}
									</PlainButton>
								))}
							</Stack>
						)}
					</LayoutContent>
				}
			/>
		</Dialog>
	)
}
