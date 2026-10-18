import { PlainButton } from "@excited-live/design-system"
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { useLocale } from "../../../lib/locale-context"
import { type PlanInput } from "../../../lib/plan-service"
import { ADD_ROW_ID } from "./EntryTable"
import { MONTHS_EN, MONTHS_TH } from "./MonthYearPicker"

export interface MilestoneRowData extends Record<string, unknown> {
	id: string
	label: string
	year?: number
	month?: number
}

export interface MilestoneTableProps {
	plan: PlanInput
	onAdd: () => void
	onEdit: (id: string) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function MilestoneTable({ plan, onAdd, onEdit, t }: MilestoneTableProps) {
	const { locale } = useLocale()
	const monthNames = locale === "th" ? MONTHS_TH : MONTHS_EN

	const addMarker: MilestoneRowData = {
		id: ADD_ROW_ID,
		label: "",
	}

	const data: MilestoneRowData[] = [
		...plan.milestones.map((m) => ({
			id: m.id,
			label: m.label,
			year: m.year,
			month: m.month,
		})),
		addMarker,
	]

	const columns: TableColumn<MilestoneRowData>[] = [
		{
			key: "name",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? (
					<PlainButton className="row-add" onClick={onAdd}>
						+ {t("milestone.add")}
					</PlainButton>
				) : (
					<PlainButton className="row-add" onClick={() => onEdit(row.id)}>
						{row.label}
					</PlainButton>
				),
		},
		{
			key: "month",
			header: t("table.month"),
			width: pixel(140),
			align: "end",
			renderCell: (row) =>
				row.id === ADD_ROW_ID ? null : (
					<Text color="secondary" hasTabularNumbers>
						{monthNames[row.month ?? 0]} {row.year}
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
		/>
	)
}
