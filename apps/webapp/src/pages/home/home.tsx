import { PlainButton } from "@excited-live/design-system"
import { HStack } from "@astryxdesign/core/HStack"
import { Stack } from "@astryxdesign/core/Stack"
import { Tab, TabList } from "@astryxdesign/core/TabList"
import { Table, pixel, proportional } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { ProjectionChart } from "./components/ProjectionChart"
import { EntryDialog } from "./components/EntryDialog"
import { ValueDialog } from "./components/ValueDialog"
import { MilestoneDialog } from "./components/MilestoneDialog"
import { MilestoneTable } from "./components/MilestoneTable"
import { GroupedPeriodTable } from "./components/GroupedPeriodTable"
import { GroupedValueTable } from "./components/GroupedValueTable"
import { TypePickerDialog } from "./components/TypePickerDialog"
import { PageEmptyState } from "../../components/PageEmptyState"
import {
	HORIZONS,
	useHome,
} from "./useHome"
import {
	type AssetTypeId,
	type ExpenseTypeId,
	type IncomeTypeId,
	type LiabilityTypeId,
} from "../../lib/plan-service"

export function Home() {
	const {
		t,
		status,
		reload,
		plan,
		horizon,
		setHorizon,
		metric,
		setMetric,
		leftTab,
		setLeftTab,
		setHoverYear,
		addedTypes,
		pickerKind,
		setPickerKind,
		entryDialog,
		setEntryDialog,
		valueDialog,
		setValueDialog,
		milestoneDialog,
		setMilestoneDialog,
		summary,
		shown,
		shownBands,
		bandCaption,
		bandStatus,
		retryBand,
		financialMetrics,
		removeEntryRow,
		removeMilestone,
		removeValueRow,
		handleSaveEntry,
		handleSaveValue,
		handleSaveMilestone,
		handlePickType,
	} = useHome()

	// Root error boundary: if root page data fails to load, show empty state with reload button.
	// Guarantees NO child endpoints are called.
	if (status === "loading") {
		return (
			<Stack className="chart-panel__inner" vAlign="center" hAlign="center" padding={4}>
				<Text color="secondary">{t("plan.lastSyncedToday")}</Text>
			</Stack>
		)
	}

	if (status === "error") {
		return (
			<PageEmptyState
				title={t("empty.home.title")}
				description={t("empty.home.description")}
				actionLabel={t("action.reload")}
				onAction={reload}
			/>
		)
	}

	return (
		<>
			<Stack className="chart-panel__inner">
				<Stack
					direction="horizontal"
					vAlign="center"
					className="chart-toolbar"
				>
					<Stack
						direction="horizontal"
						vAlign="center"
						role="group"
						aria-label={t("a11y.chartMetric")}
						className="metric-switch"
					>
						<PlainButton
							className={`metric-switch__item ${metric === "metric.netWorth" ? "is-active" : ""}`}
							onClick={() => setMetric("metric.netWorth")}
						>
							<Text
								className="metric-indicator metric-indicator--white"
								aria-hidden="true"
							>
								{""}
							</Text>
							{t("metric.netWorth")}
						</PlainButton>
						<PlainButton
							className={`metric-switch__item ${metric === "metric.cashFlow" ? "is-active" : ""}`}
							onClick={() => setMetric("metric.cashFlow")}
						>
							<Text
								className="metric-indicator metric-indicator--purple"
								aria-hidden="true"
							>
								{""}
							</Text>
							{t("metric.cashFlow")}
						</PlainButton>
					</Stack>
					<Stack
						direction="horizontal"
						vAlign="center"
						role="group"
						aria-label={t("a11y.chartPeriod")}
						className="period-switch"
					>
						{HORIZONS.map((item) => (
							<PlainButton
								className={`period-switch__item ${horizon === item ? "is-active" : ""}`}
								key={item}
								aria-pressed={horizon === item}
								onClick={() => setHorizon(item)}
							>
								{item === "all" ? t("period.all") : `${item}Y`}
							</PlainButton>
						))}
					</Stack>
				</Stack>

				<Stack className="chart-canvas">
					{summary.ok && shown ? (
						<ProjectionChart
							years={shown}
							metric={
								metric === "metric.netWorth"
									? "netWorth"
									: "cashFlow"
							}
							ariaLabel={t(
								metric === "metric.netWorth"
									? "chart.aria.netWorth"
									: "chart.aria.cashFlow",
							)}
							band={shownBands ?? undefined}
							milestones={plan.milestones}
							onActiveYearChange={setHoverYear}
						/>
					) : (
						<Text color="secondary">
							{summary.ok ? "" : summary.error.message}
						</Text>
					)}
					{bandCaption ? (
						<Text
							size="sm"
							color="secondary"
							className="chart-band-caption"
						>
							{bandCaption.text}
							{bandCaption.unmetYear !== null
								? ` · ${t("chart.band.unmet", { year: String(bandCaption.unmetYear) })}`
								: ""}
						</Text>
					) : null}
					{bandStatus === "error" && metric === "metric.netWorth" ? (
						<HStack gap={2} vAlign="center" className="chart-band-caption">
							<Text size="sm" color="secondary">
								{t("component.error.band")}
							</Text>
							<PlainButton onClick={retryBand}>
								<Text size="sm">{t("action.retry")}</Text>
							</PlainButton>
						</HStack>
					) : null}
				</Stack>

				<TabList
					className="left-tabs"
					value={leftTab}
					onChange={(value) => {
						if (
							value === "milestone" ||
							value === "incomes" ||
							value === "expenses" ||
							value === "assets" ||
							value === "liabilities"
						) {
							setLeftTab(value)
						} else {
							setLeftTab("financials")
						}
					}}
					role="tablist"
					aria-label={t("a11y.leftTabs")}
					size="sm"
				>
					<Tab
						value="financials"
						label={t("tab.financials")}
						panelId="left-panel-financials"
					/>
					<Tab
						value="milestone"
						label={t("tab.milestone")}
						panelId="left-panel-milestone"
					/>
					<Tab
						value="incomes"
						label={t("tab.income")}
						panelId="left-panel-incomes"
					/>
					<Tab
						value="expenses"
						label={t("tab.expenses")}
						panelId="left-panel-expenses"
					/>
					<Tab
						value="assets"
						label={t("tab.assets")}
						panelId="left-panel-assets"
					/>
					<Tab
						value="liabilities"
						label={t("tab.liabilities")}
						panelId="left-panel-liabilities"
					/>
				</TabList>

				{leftTab === "financials" ? (
					<Stack
						id="left-panel-financials"
						className="tab-inputs"
						aria-label={t("a11y.financialSnapshot")}
					>
						<Table
							data={financialMetrics}
							idKey="key"
							density="compact"
							hasHover
							textOverflow="wrap"
							columns={[
								{
									key: "key",
									header: t("table.metric"),
									width: proportional(2),
									renderCell: (row) => (
										<Text weight="semibold">
											{t(row.key)}
										</Text>
									),
								},
								{
									key: "value",
									header: t("table.value"),
									width: pixel(130),
									align: "end",
									renderCell: (row) => (
										<Text hasTabularNumbers>
											{row.value}
										</Text>
									),
								},
							]}
						/>
					</Stack>
				) : leftTab === "milestone" ? (
					<Stack
						id="left-panel-milestone"
						className="tab-inputs"
						aria-label={t("tab.milestone")}
					>
						<MilestoneTable
							plan={plan}
							onAdd={() => setMilestoneDialog({ id: null })}
							onEdit={(id) => setMilestoneDialog({ id })}
							t={t}
						/>
					</Stack>
				) : leftTab === "incomes" ? (
					<Stack
						id="left-panel-incomes"
						className="tab-inputs"
						aria-label={t("tab.income")}
					>
						<GroupedPeriodTable
							kind="incomes"
							plan={plan}
							addedTypeIds={addedTypes.incomes}
							onAddNewItem={() =>
								setEntryDialog({
									mode: "add",
									kind: "incomes",
									lockType: false,
								})
							}
							onAddItem={(typeId) =>
								setEntryDialog({
									mode: "add",
									kind: "incomes",
									typeId: typeId as IncomeTypeId,
									lockType: true,
								})
							}
							onEditItem={(row) =>
								setEntryDialog({
									mode: "edit",
									kind: "incomes",
									rowId: row.id,
								})
							}
							t={t}
						/>
					</Stack>
				) : leftTab === "expenses" ? (
					<Stack
						id="left-panel-expenses"
						className="tab-inputs"
						aria-label={t("tab.expenses")}
					>
						<GroupedPeriodTable
							kind="expenses"
							plan={plan}
							addedTypeIds={addedTypes.expenses}
							onAddNewItem={() =>
								setEntryDialog({
									mode: "add",
									kind: "expenses",
									lockType: false,
								})
							}
							onAddItem={(typeId) =>
								setEntryDialog({
									mode: "add",
									kind: "expenses",
									typeId: typeId as ExpenseTypeId,
									lockType: true,
								})
							}
							onEditItem={(row) =>
								setEntryDialog({
									mode: "edit",
									kind: "expenses",
									rowId: row.id,
								})
							}
							t={t}
						/>
					</Stack>
				) : leftTab === "assets" ? (
					<Stack
						id="left-panel-assets"
						className="tab-inputs"
						aria-label={t("tab.assets")}
					>
						<GroupedValueTable
							kind="assets"
							plan={plan}
							addedTypeIds={addedTypes.assets}
							onAddNewItem={() =>
								setValueDialog({
									mode: "add",
									kind: "assets",
									lockType: false,
								})
							}
							onAddItem={(typeId) =>
								setValueDialog({
									mode: "add",
									kind: "assets",
									typeId: typeId as AssetTypeId,
									lockType: true,
								})
							}
							onEditItem={(row) =>
								setValueDialog({
									mode: "edit",
									kind: "assets",
									rowId: row.id,
								})
							}
							t={t}
						/>
					</Stack>
				) : (
					<Stack
						id="left-panel-liabilities"
						className="tab-inputs"
						aria-label={t("tab.liabilities")}
					>
						<GroupedValueTable
							kind="liabilities"
							plan={plan}
							addedTypeIds={addedTypes.liabilities}
							onAddNewItem={() =>
								setValueDialog({
									mode: "add",
									kind: "liabilities",
									lockType: false,
								})
							}
							onAddItem={(typeId) =>
								setValueDialog({
									mode: "add",
									kind: "liabilities",
									typeId: typeId as LiabilityTypeId,
									lockType: true,
								})
							}
							onEditItem={(row) =>
								setValueDialog({
									mode: "edit",
									kind: "liabilities",
									rowId: row.id,
								})
							}
							t={t}
						/>
					</Stack>
				)}
			</Stack>

			{entryDialog ? (
				<EntryDialog
					key={
						entryDialog.mode === "edit"
							? entryDialog.rowId
							: `${entryDialog.kind}-${entryDialog.typeId ?? "new"}`
					}
					dialog={entryDialog}
					plan={plan}
					onSave={handleSaveEntry}
					onRemove={(id) => {
						removeEntryRow(entryDialog.kind, id)
						setEntryDialog(null)
					}}
					onClose={() => setEntryDialog(null)}
					t={t}
				/>
			) : null}
			{valueDialog ? (
				<ValueDialog
					key={
						valueDialog.mode === "edit"
							? valueDialog.rowId
							: `${valueDialog.kind}-${valueDialog.typeId ?? "new"}`
					}
					dialog={valueDialog}
					plan={plan}
					onSave={handleSaveValue}
					onRemove={(id) => {
						removeValueRow(valueDialog.kind, id)
						setValueDialog(null)
					}}
					onClose={() => setValueDialog(null)}
					t={t}
				/>
			) : null}
			{milestoneDialog ? (
				<MilestoneDialog
					key={milestoneDialog.id ?? "__add__"}
					id={milestoneDialog.id}
					plan={plan}
					onSave={handleSaveMilestone}
					onRemove={(id) => {
						removeMilestone(id)
						setMilestoneDialog(null)
					}}
					onClose={() => setMilestoneDialog(null)}
					t={t}
				/>
			) : null}
			{pickerKind ? (
				<TypePickerDialog
					kind={pickerKind}
					addedTypeIds={addedTypes[pickerKind]}
					onPick={handlePickType}
					onClose={() => setPickerKind(null)}
					t={t}
				/>
			) : null}
		</>
	)
}

export default Home
