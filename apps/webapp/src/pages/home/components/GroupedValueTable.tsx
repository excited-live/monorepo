import { useState } from "react"
import { PlainButton } from "@excited-live/design-system"
import { Stack } from "@astryxdesign/core/Stack"
import {
	Table,
	pixel,
	proportional,
	useTableRowExpansion,
	type TableColumn,
} from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { formatBaht } from "../../../lib/format"
import {
	ASSET_TYPE_IDS,
	LIABILITY_TYPE_IDS,
	type AssetRow,
	type AssetTypeId,
	type LiabilityRow,
	type LiabilityTypeId,
	type PlanInput,
} from "../../../lib/plan-service"
import { ADD_ROW_ID } from "./EntryTable"

export interface ValueGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: AssetTypeId | LiabilityTypeId
	total?: number
}

export type ValueEntryItem = (AssetRow | LiabilityRow) &
	Record<string, unknown>

export interface GroupedValueTableProps {
	kind: "assets" | "liabilities"
	plan: PlanInput
	addedTypeIds: string[]
	onAddNewItem: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: AssetRow | LiabilityRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function GroupedValueTable({
	kind,
	plan,
	addedTypeIds,
	onAddNewItem,
	onAddItem,
	onEditItem,
	t,
}: GroupedValueTableProps) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "assets" ? ASSET_TYPE_IDS : LIABILITY_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<ValueGroupRowData>({
		expandedKeys,
		onToggle: (key) =>
			setExpandedKeys((prev) => {
				const next = new Set(prev)
				if (next.has(key)) next.delete(key)
				else next.add(key)
				return next
			}),
		getRowKey: (item) => item.id,
		getIsItemExpandable: (item) => item.id !== ADD_ROW_ID,
		renderExpanded: (item) => {
			const typeId = item.typeId!
			const entries = (
				plan[kind] as Array<AssetRow | LiabilityRow>
			).filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<Table
							data={entries as ValueEntryItem[]}
							idKey="id"
							density="compact"
							dividers="rows"
							hasHover
							columns={[
								{
									key: "label",
									header: t("row.label"),
									width: proportional(1),
									renderCell: (entry) => (
										<PlainButton
											className="row-add"
											onClick={() => onEditItem(entry)}
										>
											{entry.label}
										</PlainButton>
									),
								},
								{
									key: "value",
									header: t("table.value"),
									width: pixel(140),
									align: "end",
									renderCell: (entry) => (
										<Text hasTabularNumbers>
											{formatBaht(entry.value)}
										</Text>
									),
								},
							]}
						/>
					) : (
						<Text color="secondary">{t("group.empty")}</Text>
					)}
					<PlainButton className="row-add" onClick={() => onAddItem(typeId)}>
						+ {t("group.addItem", { label: t(`type.${typeId}`) })}
					</PlainButton>
				</Stack>
			)
		},
	})

	const rows: ValueGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = (
			plan[kind] as Array<AssetRow | LiabilityRow>
		).filter((r) => r.typeId === typeId)
		const total = entries.reduce((acc, r) => acc + r.value, 0)
		return {
			id: typeId,
			typeId,
			total,
		}
	})

	const addMarker: ValueGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: ValueGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<ValueGroupRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAddNewItem}>
						+ {t("row.addItem")}
					</PlainButton>
				) : (
					<Text weight="semibold">{t(`type.${row.typeId}`)}</Text>
				),
		},
		{
			key: "total",
			header: t("table.total"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text hasTabularNumbers>{formatBaht(row.total ?? 0)}</Text>
				),
		},
	]

	return (
		<Table
			data={data}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
			plugins={{ expansion }}
		/>
	)
}
