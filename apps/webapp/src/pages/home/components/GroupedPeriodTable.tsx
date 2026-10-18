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
	EXPENSE_TYPE_IDS,
	INCOME_TYPE_IDS,
	rowLifetimeTotal,
	type ExpenseTypeId,
	type IncomeTypeId,
	type PeriodRow,
	type PlanInput,
} from "../../../lib/plan-service"
import { ADD_ROW_ID, EntryTable } from "./EntryTable"

export interface PeriodGroupRowData extends Record<string, unknown> {
	id: string
	typeId?: IncomeTypeId | ExpenseTypeId
	total?: number
	periodText?: string
}

export interface GroupedPeriodTableProps {
	kind: "incomes" | "expenses"
	plan: PlanInput
	addedTypeIds: string[]
	onAddNewItem: () => void
	onAddItem: (typeId: string) => void
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function GroupedPeriodTable({
	kind,
	plan,
	addedTypeIds,
	onAddNewItem,
	onAddItem,
	onEditItem,
	t,
}: GroupedPeriodTableProps) {
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
	const catalog = kind === "incomes" ? INCOME_TYPE_IDS : EXPENSE_TYPE_IDS
	const activeTypeIds = catalog.filter((id) => addedTypeIds.includes(id))

	const expansion = useTableRowExpansion<PeriodGroupRowData>({
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
			const entries = plan[kind].filter((r) => r.typeId === typeId)
			return (
				<Stack className="row-detail" gap={1.5}>
					{entries.length > 0 ? (
						<EntryTable
							rows={entries}
							plan={plan}
							onEditItem={onEditItem}
							t={t}
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

	const rows: PeriodGroupRowData[] = activeTypeIds.map((typeId) => {
		const entries = plan[kind].filter((r) => r.typeId === typeId)
		const total = entries.reduce(
			(acc, r) => acc + rowLifetimeTotal(r, plan),
			0,
		)
		let periodText = "—"
		if (entries.length > 0) {
			const minStart = Math.min(...entries.map((r) => r.startYear))
			const hasForever = entries.some((r) => r.endYear === null)
			const maxEnd = hasForever
				? "∞"
				: Math.max(...entries.map((r) => r.endYear as number))
			periodText = `${minStart} – ${maxEnd}`
		}
		return {
			id: typeId,
			typeId,
			total,
			periodText,
		}
	})

	const addMarker: PeriodGroupRowData = {
		id: ADD_ROW_ID,
	}

	const data: PeriodGroupRowData[] = [...rows, addMarker]

	const columns: TableColumn<PeriodGroupRowData>[] = [
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
		{
			key: "period",
			header: t("row.period"),
			width: pixel(120),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{row.periodText}
					</Text>
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
