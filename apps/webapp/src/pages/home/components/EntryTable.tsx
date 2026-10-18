import { PlainButton } from "@excited-live/design-system"
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { formatBaht } from "../../../lib/format"
import {
	rowLifetimeTotal,
	type PeriodRow,
	type PlanInput,
} from "../../../lib/plan-service"

/** Row id for the synthetic "+ Add row" line at the bottom of an editor table. */
export const ADD_ROW_ID = "__add__"

/** Nested entry table rendered inside an expanded income/expense type group. */
export type PeriodRowItem = PeriodRow & Record<string, unknown>

export interface EntryTableProps {
	rows: PeriodRow[]
	plan: PlanInput
	onEditItem: (row: PeriodRow) => void
	t: (key: string, vars?: Record<string, string>) => string
}

export function EntryTable({ rows, plan, onEditItem, t }: EntryTableProps) {
	const columns: TableColumn<PeriodRowItem>[] = [
		{
			key: "label",
			header: t("row.label"),
			width: proportional(1),
			renderCell: (row) => (
				<PlainButton className="row-add" onClick={() => onEditItem(row)}>
					{row.label}
				</PlainButton>
			),
		},
		{
			key: "period",
			header: t("row.period"),
			width: pixel(110),
			align: "end",
			renderCell: (row) => (
				<Text color="secondary" hasTabularNumbers>
					{row.startYear} – {row.endYear ?? "∞"}
				</Text>
			),
		},
		{
			key: "amount",
			header: t("table.rate"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(row.amount)}{" "}
					{t(row.frequency === "monthly" ? "freq.perMonth" : "freq.perYear")}
				</Text>
			),
		},
		{
			key: "lifetime",
			header: t("table.lifetime"),
			width: pixel(140),
			align: "end",
			renderCell: (row) => (
				<Text hasTabularNumbers>
					{formatBaht(rowLifetimeTotal(row, plan))}
				</Text>
			),
		},
	]

	return (
		<Table
			data={rows as PeriodRowItem[]}
			idKey="id"
			density="compact"
			dividers="rows"
			hasHover
			columns={columns}
		/>
	)
}
