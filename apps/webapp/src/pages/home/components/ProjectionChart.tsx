/**
 * ProjectionChart — the one custom visual on the dashboard (a line chart is
 * the single thing Astryx has no primitive for). Rendered with Apache ECharts
 * (tree-shaken: line chart + grid + tooltip on the canvas renderer), so the
 * heavy interaction layer (hover inspection, pointer tracking, crisp resize)
 * no longer has to be hand-rolled SVG. Supports two metrics (net worth /
 * cash flow); hovering inspects a year and syncs the readout above the chart
 * and the panels below via `onActiveYearChange`. Monte Carlo P10/P90 years
 * draw as a shaded band; unmet-spend years get a ⚠ in the readout.
 *
 * Look is unchanged from the previous hand-rolled SVG version: accent line,
 * gradient area under the line, dashed orange zero line when the scale dips
 * negative, dashed orange milestone markers, x labels every 10 years plus the final year. Colors are read
 * from the Astryx theme CSS variables at render time (canvas cannot resolve
 * `var(...)` or `light-dark(...)` on its own), with light-theme fallbacks.
 * The Astryx root Theme sets `data-astryx-theme` on <html> in a layout
 * effect AFTER our first commit — resolving colors before that moment picks
 * up the library-default palette (blue accent) and flashed blue on first
 * load. So chart init and option building are deferred until the theme
 * attribute exists (the container stays blank cream, matching the card).
 */
import { useEffect, useMemo, useRef, useState } from "react"
import * as echarts from "echarts/core"
import { LineChart } from "echarts/charts"
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { EChartsType } from "echarts/core"
import { Stack } from "@astryxdesign/core/Stack"
import { Text } from "@astryxdesign/core/Text"
import type { MilestoneRow, MonteCarloBand, SimulationYear } from "../../../lib/plan-service"
import { formatBaht, formatBahtCompact } from "../../../lib/format"

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer])

const FONT_FAMILY = '"Sofia Sans", Arial, "Helvetica Neue", sans-serif'
/** Matches the old SVG geometry: 64px label gutter, tight right/top padding. */
const GRID = { left: 64, right: 14, top: 14, bottom: 26 }
const HOST_HEIGHT = 320

export interface ProjectionChartProps {
	/** Projected years to draw (already sliced to the active period). */
	years: SimulationYear[]
	/** Which series to draw: end-of-year net worth or yearly cash flow. */
	metric?: "netWorth" | "cashFlow"
	ariaLabel: string
	/**
	 * US-110 — Monte Carlo P10/P90 band, index-aligned with `years` (same
	 * metric units). Drawn as a shaded area under the plan line.
	 */
	band?: readonly MonteCarloBand[]
	/**
	 * Milestone markers to draw as dashed vertical lines.
	 */
	milestones?: ReadonlyArray<MilestoneRow>
	/** Fired on hover/leave so panels below can mirror the active year. */
	onActiveYearChange?: (year: number | null) => void
}

/** Net-worth or cash-flow value for one simulated year (pure, per metric). */
function valueOf(year: SimulationYear, metric: ProjectionChartProps["metric"]): number {
	return metric === "netWorth" ? year.netWorth : year.netCash
}

/**
 * Resolve a theme CSS variable to a concrete computed color (rgb/rgba).
 * Tokens are authored as `light-dark(...)`, which canvas cannot parse, so a
 * hidden probe element lets the browser resolve it per color-scheme first.
 */
function resolveColor(varName: string, fallback: string): string {
	if (typeof document === "undefined") return fallback
	const probe = document.createElement("span")
	probe.style.display = "none"
	probe.style.color = `var(${varName})`
	document.body.appendChild(probe)
	const resolved = getComputedStyle(probe).color
	probe.remove()
	return resolved || fallback
}

/** The five theme colors the chart is drawn with. */
interface ChartPalette {
	accent: string
	secondary: string
	border: string
	orange: string
	onAccent: string
}

/**
 * Read the palette from live CSS variables. Returns null until the Astryx
 * root Theme provider has stamped `data-astryx-theme` on <html> — before
 * that the cascade still resolves to the library-default palette (blue
 * accent), which is exactly the first-load flash this guards against.
 */
function readPalette(): ChartPalette | null {
	if (typeof document === "undefined") return null
	if (!document.documentElement.hasAttribute("data-astryx-theme")) return null
	return {
		accent: resolveColor("--color-accent", "#141413"),
		secondary: resolveColor("--color-text-secondary", "#696969"),
		border: resolveColor("--color-border", "rgba(20, 20, 19, 0.1)"),
		orange: resolveColor("--color-text-orange", "#9A3A0A"),
		onAccent: resolveColor("--color-on-accent", "#F3F0EE"),
	}
}

/** Inject an alpha channel into a resolved rgb()/rgba() color string. */
function withAlpha(color: string, alpha: number): string {
	const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color)
	if (!match) return color
	return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
}

export function ProjectionChart({
	years,
	metric = "netWorth",
	ariaLabel,
	band,
	milestones,
	onActiveYearChange,
}: ProjectionChartProps) {
	const containerRef = useRef<HTMLElement | null>(null)
	const chartRef = useRef<EChartsType | null>(null)
	const [active, setActive] = useState<SimulationYear | null>(null)
	// Flips once the Astryx root Theme provider has stamped its scope
	// attribute on <html>; before that the chart palette is not trustworthy.
	const [themeReady, setThemeReady] = useState(false)

	const onActiveYearRef = useRef(onActiveYearChange)

	// Keep the latest callback without re-initializing the chart on rerenders.
	useEffect(() => {
		onActiveYearRef.current = onActiveYearChange
	}, [onActiveYearChange])

	// One-time init/teardown: chart instance, crisp resize, hover-leave reset.
	// Deferred until the theme palette is readable: the Astryx root Theme
	// stamps `data-astryx-theme` on <html> in its layout effect, which runs
	// AFTER this component's first commit. Initializing before that moment
	// resolved colors against the library-default palette (blue accent) and
	// flashed blue on first load. The MutationObserver below fires exactly
	// when the attribute lands; the palette/option memos then rebuild and
	// the option effect replays into the freshly created instance.
	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		let observer: ResizeObserver | null = null
		let mutation: MutationObserver | null = null
		const start = (chart: EChartsType) => {
			observer = new ResizeObserver(() => chart.resize())
			observer.observe(container)
			const handleGlobalOut = () => {
				setActive(null)
				onActiveYearRef.current?.(null)
			}
			chart.getZr().on("globalout", handleGlobalOut)
		}
		const teardown = () => {
			mutation?.disconnect()
			mutation = null
			observer?.disconnect()
			observer = null
			chartRef.current?.getZr().off("globalout")
			chartRef.current?.dispose()
			chartRef.current = null
		}
		const tryStart = () => {
			if (chartRef.current || !readPalette()) return
			const chart = echarts.init(container, undefined, { renderer: "canvas" })
			chartRef.current = chart
			start(chart)
			mutation?.disconnect()
			mutation = null
			// Unlock the palette/option memos so the themed option is built
			// and pushed into the instance we just created.
			setThemeReady(true)
		}
		tryStart()
		if (!chartRef.current) {
			mutation = new MutationObserver(tryStart)
			mutation.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-astryx-theme"],
			})
		}
		return teardown
	}, [])

	// Option is built only once the theme palette is readable. Until then
	// palette is null and the memo yields null — nothing is pushed to a
	// chart that does not exist yet, and no default-palette option is
	// ever constructed.
	const palette = useMemo(() => (themeReady ? readPalette() : null), [themeReady])
	const option = useMemo<echarts.EChartsCoreOption | null>(() => {
		if (!palette) return null
		const { accent, secondary, border, orange, onAccent } = palette

		const values = years.map((year) => valueOf(year, metric))
		// Band edges widen the scale so the shaded area always fits. The band
		// arrives in the active metric's units (mapped by the caller).
		const bandAligned = band && band.length === years.length ? band : null
		const scaleValues = [...values]
		if (bandAligned) {
			for (const entry of bandAligned) scaleValues.push(entry.p10, entry.p90)
		}
		const rawMax = Math.max(...scaleValues, 0)
		const rawMin = Math.min(...scaleValues, 0)
		const span = rawMax - rawMin || 1

		const categories = years.map((year) => String(year.year))

		const readout = (year: SimulationYear) =>
			`${year.year} · ${formatBaht(valueOf(year, metric))}${year.unmet ? " · ⚠" : ""}`

		const bandSeries = bandAligned
			? [
					{
						// Lower edge of the band: stacked base for the delta above.
						name: "band-base",
						type: "line",
						data: bandAligned.map((entry) => entry.p10),
						stack: "projection-band",
						symbol: "none",
						lineStyle: { opacity: 0 },
						silent: true,
						tooltip: { show: false },
					},
					{
						// Upper edge drawn as p10 + (p90 − p10), filled between.
						name: "band-range",
						type: "line",
						data: bandAligned.map((entry) => entry.p90 - entry.p10),
						stack: "projection-band",
						symbol: "none",
						lineStyle: { opacity: 0 },
						areaStyle: { color: withAlpha(accent, 0.1) },
						silent: true,
						tooltip: { show: false },
					},
				]
			: []

		const markLineData: Array<Record<string, unknown>> = []
		if (rawMin < 0) {
			markLineData.push({ yAxis: 0, label: { show: false } })
		}
		if (milestones) {
			const categorySet = new Set(categories)
			for (const m of milestones) {
				if (categorySet.has(String(m.year))) {
					markLineData.push({
						xAxis: String(m.year),
						label: {
							show: true,
							formatter: m.label,
							position: "insideEndTop",
							color: orange,
							fontSize: 11,
							fontFamily: FONT_FAMILY,
						},
					})
				}
			}
		}

		return {
			animation: false,
			grid: { ...GRID, containLabel: false },
			xAxis: {
				type: "category",
				data: categories,
				boundaryGap: false,
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					show: true,
					color: secondary,
					fontSize: 12,
					fontFamily: FONT_FAMILY,
					// Same cadence as before: every 10th year plus the final one.
					interval: (index: number) => index % 10 === 0 || index === categories.length - 1,
				},
			},
			yAxis: {
				type: "value",
				min: rawMin,
				max: rawMin + span,
				interval: span / 4,
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { lineStyle: { color: border, width: 1 } },
				axisLabel: {
					color: secondary,
					fontSize: 12,
					fontFamily: FONT_FAMILY,
					formatter: (value: number) => formatBahtCompact(value),
				},
			},
			tooltip: {
				trigger: "axis",
				axisPointer: { type: "line", lineStyle: { color: border, width: 1 } },
				backgroundColor: accent,
				borderWidth: 0,
				padding: [6, 10],
				textStyle: { color: onAccent, fontSize: 12, fontFamily: FONT_FAMILY },
				formatter: (params: unknown) => {
					const list = (Array.isArray(params) ? params : [params]) as Array<{
						seriesName?: string
						dataIndex?: number
					}>
					const hit = list.find((entry) => entry.seriesName === "plan" && entry.dataIndex != null)
					if (!hit || hit.dataIndex == null) return ""
					const year = years[hit.dataIndex]
					if (!year) return ""
					setActive(year)
					onActiveYearRef.current?.(year.year)
					return readout(year)
				},
			},
			series: [
				...bandSeries,
				{
					name: "plan",
					type: "line",
					data: values,
					// Dot appears only under the cursor, like the old active marker.
					symbol: "circle",
					symbolSize: 10,
					showSymbol: false,
					lineStyle: { color: accent, width: 2.5 },
					itemStyle: { color: accent },
					areaStyle: {
						color: {
							type: "linear",
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: withAlpha(accent, 0.28) },
								{ offset: 1, color: withAlpha(accent, 0.02) },
							],
						},
					},
					markLine:
						markLineData.length > 0
							? {
									silent: true,
									symbol: "none",
									lineStyle: { color: orange, width: 1, type: "dashed" },
									data: markLineData,
								}
							: undefined,
				},
			],
		}
	}, [palette, years, metric, band, milestones])

	// Push option updates (metric switch, horizon change, band recompute).
	// Also the replay path for deferred init: when the chart instance is
	// created after the theme lands, this effect pushes the current option.
	useEffect(() => {
		if (!option) return
		chartRef.current?.setOption(option, { notMerge: true })
	}, [option])

	// Readout mirrors the old chart: hovered year, else the final year.
	const readoutYear = active ?? years.at(-1)

	return (
		<Stack gap={1}>
			{readoutYear ? (
				<Text size="sm" color="secondary">
					{readoutYear.year} · {formatBaht(valueOf(readoutYear, metric))}
					{readoutYear.unmet ? " · ⚠" : ""}
				</Text>
			) : null}
			<Stack
				ref={containerRef}
				role="img"
				aria-label={ariaLabel}
				className="mvp-chart-echarts"
				style={{ width: "100%", height: HOST_HEIGHT, touchAction: "none" }}
			/>
		</Stack>
	)
}
