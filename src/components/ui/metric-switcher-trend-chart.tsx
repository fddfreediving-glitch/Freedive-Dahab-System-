"use client"

/**
 * Metric Switcher Trend Chart
 * ----------------------------------------------------------------------------
 * A data-driven trend chart block: switch between KPI series, change the date
 * range, compare against the previous period, read annotated events (releases /
 * campaigns), inspect a point with pointer OR keyboard, and export the visible
 * window as CSV.
 *
 * Dependencies
 *   - react >= 18
 *   - lucide-react (icons)
 *   - Tailwind CSS with the shadcn/ui theme variables (card, muted, border,
 *     popover, primary, destructive, ring, accent). Every structural color is
 *     applied through a semantic utility class rather than a raw variable, so
 *     the component stays portable across shadcn theme presets.
 *
 * Theming
 *   The component contains no hardcoded colors. Series colors come from props,
 *   so you pass your own tokens, e.g. `color: "var(--color-chart-1)"`. A series
 *   with no `color` falls back to `currentColor`, resolved from the theme's
 *   primary. Light and dark mode work out of the box; the component never owns,
 *   stores or toggles the theme.
 *
 * Usage
 *   <MetricTrendChart
 *     title="Storefront performance"
 *     dates={dates}
 *     metrics={[
 *       {
 *         id: "orders",
 *         label: "Orders",
 *         unit: "count",
 *         aggregate: "sum",
 *         color: "var(--color-chart-1)",
 *         current: ordersCurrent,   // oldest -> newest
 *         previous: ordersPrevious, // same length, aligned per slot
 *       },
 *     ]}
 *     annotations={[
 *       { id: "r1", type: "marker", at: 171, label: "Checkout v2" },
 *       { id: "s1", type: "band", from: 175, to: 178, label: "Flash sale" },
 *     ]}
 *   />
 */

import * as React from "react"
import { ArrowDown, ArrowUp, Download, Table2 } from "lucide-react"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Built-in value formatters. Use `MetricSeries.format` for anything else. */
export type MetricUnit = "count" | "currency" | "ms" | "percent"

export interface MetricSeries {
  /** Stable identifier, also used as the controlled `metricId` value. */
  id: string
  /** Human label shown on the KPI card, legend and tooltip. */
  label: string
  /**
   * Values for the whole available timeline, **oldest first, newest last**.
   * All series should share the same length; the chart windows from the end.
   */
  current: number[]
  /**
   * Comparison values, aligned slot-for-slot with `current` (so `previous[i]`
   * is the value that slot had in the preceding period). Omit to hide the
   * comparison line, legend entry and deltas for this series.
   */
  previous?: number[]
  /**
   * Any CSS color. Recommended: a shadcn design token such as
   * `var(--color-chart-1)`. Defaults to `currentColor`, i.e. the theme's
   * primary color.
   */
  color?: string
  /** Built-in formatter to use. Default: `"count"`. */
  unit?: MetricUnit
  /** ISO 4217 code used when `unit` is `"currency"`. Default: `"USD"`. */
  currency?: string
  /** How the KPI headline is reduced over the window. Default: `"sum"`. */
  aggregate?: "sum" | "avg"
  /** Whether a rise is good (drives the delta color). Default: `true`. */
  higherIsBetter?: boolean
  /** Full override of value formatting; wins over `unit`. */
  format?: (value: number) => string
}

export interface MetricRange {
  /** Stable identifier, also used as the controlled `rangeId` value. */
  id: string
  /** Short label for the range switcher, e.g. `"30D"`. */
  label: string
  /** How many trailing slots this range shows. */
  days: number
}

/**
 * Events drawn above the plot. `at` / `from` / `to` are **indices into the
 * full timeline** (same indexing as `MetricSeries.current`), so an annotation
 * keeps pointing at the same day whichever range is selected.
 */
export type MetricAnnotation =
  | { id: string; type: "marker"; at: number; label: string }
  | { id: string; type: "band"; from: number; to: number; label: string }

export interface MetricTrendChartProps {
  /** One entry per switchable KPI. At least one is required. */
  metrics: MetricSeries[]
  /**
   * Timeline labels aligned with the series values (oldest first). Accepts
   * `Date` or any `Date`-parsable value. Defaults to the N days ending today.
   */
  dates?: Array<Date | string | number>
  /**
   * Range options. Defaults to 7D / 14D / 30D / 90D filtered to the ranges the
   * data can actually fill, falling back to a single full-timeline range.
   */
  ranges?: MetricRange[]
  /** Events drawn above the plot. */
  annotations?: MetricAnnotation[]
  /** Card heading. Omit to hide the heading. */
  title?: React.ReactNode
  /** Card sub-heading. Defaults to a "compared to previous N days" sentence. */
  description?: React.ReactNode
  /** Initially selected metric (uncontrolled). Defaults to the first metric. */
  defaultMetricId?: string
  /** Initially selected range (uncontrolled). Defaults to the shortest range. */
  defaultRangeId?: string
  /** Controlled selected metric. Pair with `onMetricChange`. */
  metricId?: string
  /** Controlled selected range. Pair with `onRangeChange`. */
  rangeId?: string
  onMetricChange?: (metricId: string) => void
  onRangeChange?: (rangeId: string) => void
  /** BCP 47 locale for number and date formatting. Default: `"en-US"`. */
  locale?: string
  /** Show the previous-period line, legend entry and deltas. Default: `true`. */
  showComparison?: boolean
  /** Show the "View as table" disclosure. Default: `true`. */
  showTable?: boolean
  /** Show the "Export CSV" action. Default: `true`. */
  showExport?: boolean
  /**
   * Replace the built-in CSV download. Receives the visible window as rows;
   * when provided, the component downloads nothing itself.
   */
  onExport?: (
    rows: Array<{ date: Date; current: number; previous?: number }>,
    metric: MetricSeries
  ) => void
  /**
   * `"zero"` anchors the y-axis at zero (right for volume metrics like orders
   * or revenue). `"auto"` fits the axis to the data range, so a metric that
   * lives near 99.9% is not flattened against the top. Default: `"zero"`.
   */
  yAxis?: "zero" | "auto"
  /** Plot height in pixels, excluding axes and annotation rows. Default: `260`. */
  height?: number
  /** Rendered instead of the chart when there is no data. */
  emptyState?: React.ReactNode
  /** Appended to the root element's classes. */
  className?: string
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Local class joiner, same contract as shadcn's `cn`. Kept inline so the
 * component installs with no dependency beyond lucide-react.
 */
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

const DEFAULT_RANGE_DAYS = [7, 14, 30, 90]
const AXIS_FONT = 11.5
const LABEL_FONT = 11.5
const LABEL_ROW_H = 16
const PAD_RIGHT = 14
const PAD_BOTTOM = 26

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

function reduceValues(values: number[], mode: "sum" | "avg") {
  if (values.length === 0) return 0
  const total = values.reduce((sum, v) => sum + v, 0)
  return mode === "avg" ? total / values.length : total
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Rounds a rough interval to the nearest 1 / 2 / 2.5 / 5 at its magnitude. */
function niceStep(rough: number) {
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return factor * magnitude
}

/**
 * Builds a readable y-axis so gridlines land on 0 / 200 / 400 instead of
 * 0 / 294.9 / 589.8, and so a metric that lives near 99.9% is not flattened
 * against the top of a 0-based axis.
 */
function niceScale(
  min: number,
  max: number,
  divisions = 3
): { min: number; max: number; ticks: number[] } {
  const span = max - min
  if (!Number.isFinite(span) || span <= 0) {
    const top = Number.isFinite(max) && max > 0 ? max : 1
    return { min: 0, max: top, ticks: [0, top] }
  }

  const step = niceStep(span / divisions)
  const floor = Math.floor(min / step) * step
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  // Guard against a pathological step producing an unbounded loop.
  for (let v = floor, i = 0; v <= top + step * 1e-9 && i < 24; v += step, i++) {
    ticks.push(Number(v.toFixed(10)))
  }
  return { min: floor, max: top, ticks }
}

/**
 * Catmull-Rom spline converted to cubic beziers.
 *
 * For each segment p1 -> p2 we take the neighbours p0 and p3 and derive the two
 * control points from the neighbour-to-neighbour tangents scaled by 1/6 — the
 * standard Catmull-Rom-to-Bezier conversion. Endpoints reuse themselves as the
 * missing neighbour, so the curve starts and ends exactly on the data points.
 */
function smoothPath(points: Array<[number, number]>) {
  if (points.length === 0) return ""
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`
  if (points.length === 2) {
    return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`
  }
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

interface PendingLabel {
  id: string
  x: number
  text: string
}

interface PlacedLabel extends PendingLabel {
  row: number
}

/**
 * Places annotation labels so they never overlap: clamp each label inside the
 * plot, then greedily drop it into the first row whose previous label ends far
 * enough to the left. A label that fits nowhere is omitted rather than drawn
 * on top of another one.
 */
function layoutAnnotationLabels(
  items: PendingLabel[],
  left: number,
  right: number,
  maxRows = 2
): { labels: PlacedLabel[]; rows: number } {
  const available = right - left
  const rowRight: number[] = []
  const labels: PlacedLabel[] = []

  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    // Rough advance width: good enough for collision avoidance without
    // measuring text in the DOM, which would not work during SSR.
    const width = item.text.length * LABEL_FONT * 0.56
    if (width > available) continue

    const center = Math.min(Math.max(item.x, left + width / 2), right - width / 2)
    const start = center - width / 2
    const end = center + width / 2

    let row = -1
    for (let r = 0; r < maxRows; r++) {
      if (rowRight[r] === undefined || start >= rowRight[r] + 8) {
        row = r
        break
      }
    }
    if (row === -1) continue

    rowRight[row] = end
    labels.push({ ...item, x: center, row })
  }

  return { labels, rows: rowRight.length }
}

/** Tracks the rendered width so SVG text stays at its true pixel size. */
function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>, fallback = 720) {
  const [width, setWidth] = React.useState(fallback)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next && next > 0) setWidth(next)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Controlled-or-uncontrolled selection state. */
function useSelection(
  controlled: string | undefined,
  fallback: string,
  onChange?: (value: string) => void
) {
  const [internal, setInternal] = React.useState(fallback)
  const value = controlled ?? (internal || fallback)
  const set = React.useCallback(
    (next: string) => {
      if (controlled === undefined) setInternal(next)
      onChange?.(next)
    },
    [controlled, onChange]
  )
  return [value, set] as const
}

/** Arrow / Home / End navigation with roving tabindex, for a tablist or radiogroup. */
function rovingKeyDown(
  event: React.KeyboardEvent<HTMLElement>,
  ids: string[],
  activeId: string,
  select: (id: string) => void
) {
  const last = ids.length - 1
  const index = Math.max(0, ids.indexOf(activeId))
  let next: number | null = null

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = index === last ? 0 : index + 1
      break
    case "ArrowLeft":
    case "ArrowUp":
      next = index === 0 ? last : index - 1
      break
    case "Home":
      next = 0
      break
    case "End":
      next = last
      break
    default:
      return
  }

  event.preventDefault()
  const id = ids[next]
  select(id)
  const container = event.currentTarget.parentElement
  container?.querySelector<HTMLElement>(`[data-item-id="${id}"]`)?.focus()
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export function MetricTrendChart({
  metrics,
  dates,
  ranges,
  annotations = [],
  title,
  description,
  defaultMetricId,
  defaultRangeId,
  metricId: metricIdProp,
  rangeId: rangeIdProp,
  onMetricChange,
  onRangeChange,
  locale = "en-US",
  showComparison = true,
  showTable = true,
  showExport = true,
  onExport,
  yAxis = "zero",
  height = 260,
  emptyState,
  className,
}: MetricTrendChartProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const plotRef = React.useRef<HTMLDivElement | null>(null)
  const chartWidth = useMeasuredWidth(plotRef)

  const timelineLength = React.useMemo(
    () => (metrics.length ? Math.min(...metrics.map((m) => m.current.length)) : 0),
    [metrics]
  )

  const rangeOptions = React.useMemo<MetricRange[]>(() => {
    if (ranges?.length) return ranges
    const usable = DEFAULT_RANGE_DAYS.filter((d) => d <= timelineLength)
    if (usable.length === 0) {
      return [{ id: "all", label: "All", days: Math.max(timelineLength, 1) }]
    }
    return usable.map((d) => ({ id: `${d}d`, label: `${d}D`, days: d }))
  }, [ranges, timelineLength])

  const [metricId, setMetricId] = useSelection(
    metricIdProp,
    defaultMetricId ?? metrics[0]?.id ?? "",
    onMetricChange
  )
  const [rangeId, setRangeId] = useSelection(
    rangeIdProp,
    defaultRangeId ?? rangeOptions[0]?.id ?? "",
    onRangeChange
  )
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const [tableOpen, setTableOpen] = React.useState(false)

  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0]
  const range = rangeOptions.find((r) => r.id === rangeId) ?? rangeOptions[0]

  /* ----------------------------- formatting ----------------------------- */

  const formatValue = React.useCallback(
    (value: number, series: MetricSeries) => {
      if (series.format) return series.format(value)
      switch (series.unit) {
        case "currency":
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: series.currency ?? "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value)
        case "ms":
          return `${Math.round(value)} ms`
        case "percent":
          return `${value.toFixed(1)}%`
        default:
          return new Intl.NumberFormat(locale, {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value)
      }
    },
    [locale]
  )

  const shortDate = React.useCallback(
    (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    [locale]
  )
  const longDate = React.useCallback(
    (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }),
    [locale]
  )

  /* ------------------------------ timeline ------------------------------ */

  const timeline = React.useMemo(() => {
    if (dates?.length) {
      return Array.from({ length: timelineLength }, (_, i) =>
        toDate(dates[i] ?? dates[dates.length - 1])
      )
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: timelineLength }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (timelineLength - 1 - i))
      return d
    })
  }, [dates, timelineLength])

  const windowDays = Math.min(range?.days ?? timelineLength, timelineLength)
  const windowStart = Math.max(0, timelineLength - windowDays)
  const windowLength = timelineLength - windowStart

  const hasComparison = showComparison && Boolean(metric?.previous?.length)

  const windowed = React.useMemo(() => {
    if (!metric || windowLength === 0) {
      return { current: [] as number[], previous: undefined as number[] | undefined, dates: [] as Date[] }
    }
    return {
      current: metric.current.slice(windowStart, timelineLength),
      previous: hasComparison ? metric.previous!.slice(windowStart, timelineLength) : undefined,
      dates: timeline.slice(windowStart, timelineLength),
    }
  }, [metric, windowStart, timelineLength, windowLength, hasComparison, timeline])

  /** Dates the comparison line stands for, when the timeline reaches back far enough. */
  const previousWindowDates = React.useMemo(() => {
    const start = windowStart - windowLength
    if (!hasComparison || start < 0 || windowLength === 0) return null
    return { from: timeline[start], to: timeline[windowStart - 1] }
  }, [hasComparison, windowStart, windowLength, timeline])

  /* ------------------------------ KPI cards ----------------------------- */

  const cards = React.useMemo(
    () =>
      metrics.map((m) => {
        const mode = m.aggregate ?? "sum"
        const currentAgg = reduceValues(m.current.slice(windowStart, timelineLength), mode)
        const comparable = showComparison && m.previous?.length
        const previousAgg = comparable
          ? reduceValues(m.previous!.slice(windowStart, timelineLength), mode)
          : null
        const delta =
          previousAgg === null || previousAgg === 0
            ? null
            : ((currentAgg - previousAgg) / previousAgg) * 100
        const positive = delta === null ? null : (m.higherIsBetter ?? true) ? delta >= 0 : delta <= 0
        return { metric: m, currentAgg, delta, positive }
      }),
    [metrics, windowStart, timelineLength, showComparison]
  )

  /* -------------------------------- scales ------------------------------- */

  const seriesColor = metric?.color ?? "currentColor"
  const usesThemePrimary = !metric?.color

  const geometry = React.useMemo(() => {
    const n = windowed.current.length
    const all = [...windowed.current, ...(windowed.previous ?? [])]
    const dataMax = all.length ? Math.max(...all) : 1
    const dataMin = all.length ? Math.min(...all) : 0
    const {
      min: minValue,
      max: maxValue,
      ticks: yTicks,
    } = yAxis === "auto"
      ? niceScale(dataMin, dataMax)
      : niceScale(0, Math.max(dataMax, 1) * 1.02)

    // Reserve left padding from the widest y-axis label so it is never clipped.
    const axisLabels = yTicks.map((value) => (metric ? formatValue(value, metric) : ""))
    const widest = axisLabels.reduce((max, l) => Math.max(max, l.length), 1)
    const padLeft = Math.min(
      Math.round(14 + widest * AXIS_FONT * 0.62),
      Math.max(48, chartWidth * 0.3)
    )

    const plotWidth = Math.max(chartWidth - padLeft - PAD_RIGHT, 1)
    const step = n > 1 ? plotWidth / (n - 1) : 0
    const xAt = (i: number) => padLeft + i * step

    // Annotations are indexed against the full timeline; keep only the parts
    // that actually intersect the visible window.
    const pending: PendingLabel[] = []
    const markers: Array<{ id: string; x: number }> = []
    const bands: Array<{ id: string; x: number; width: number }> = []

    for (const a of annotations) {
      if (a.type === "marker") {
        if (a.at < windowStart || a.at > timelineLength - 1) continue
        const x = xAt(a.at - windowStart)
        markers.push({ id: a.id, x })
        pending.push({ id: a.id, x, text: a.label })
      } else {
        const from = Math.min(a.from, a.to)
        const to = Math.max(a.from, a.to)
        if (to < windowStart || from > timelineLength - 1) continue
        const x1 = xAt(Math.max(from, windowStart) - windowStart)
        const x2 = xAt(Math.min(to, timelineLength - 1) - windowStart)
        const width = Math.max(x2 - x1, 2)
        bands.push({ id: a.id, x: x1, width })
        // A band squeezed below a few pixels gets no label: an orphan label
        // floating over an invisible band reads as a rendering bug.
        if (width >= 6) pending.push({ id: a.id, x: (x1 + x2) / 2, text: a.label })
      }
    }

    const { labels, rows } = layoutAnnotationLabels(pending, padLeft, chartWidth - PAD_RIGHT)
    const padTop = 10 + rows * LABEL_ROW_H
    const plotHeight = height
    const totalHeight = padTop + plotHeight + PAD_BOTTOM
    const baselineY = padTop + plotHeight
    const span = maxValue - minValue || 1
    const yAt = (v: number) => padTop + plotHeight - ((v - minValue) / span) * plotHeight

    const points = windowed.current.map<[number, number]>((v, i) => [xAt(i), yAt(v)])
    const ghostPoints = (windowed.previous ?? []).map<[number, number]>((v, i) => [xAt(i), yAt(v)])
    const linePath = smoothPath(points)
    const areaPath =
      points.length > 1 ? `${linePath} L${xAt(n - 1)},${baselineY} L${xAt(0)},${baselineY} Z` : ""

    // One tick per ~110px keeps date labels readable on narrow screens.
    const tickCount = Math.max(2, Math.min(n, Math.floor(plotWidth / 110) + 1))
    const tickIndices =
      n <= 1
        ? [0]
        : Array.from({ length: tickCount }, (_, i) => Math.round((i * (n - 1)) / (tickCount - 1)))

    return {
      n,
      padLeft,
      padTop,
      plotHeight,
      totalHeight,
      baselineY,
      step,
      xAt,
      yAt,
      linePath,
      areaPath,
      ghostPath: smoothPath(ghostPoints),
      markers,
      bands,
      labels,
      labelRows: rows,
      tickIndices,
      yTicks,
      axisLabels,
    }
  }, [
    windowed,
    chartWidth,
    height,
    yAxis,
    annotations,
    windowStart,
    timelineLength,
    metric,
    formatValue,
  ])

  /* ------------------------------ interaction ---------------------------- */

  const clampIndex = React.useCallback(
    (i: number) => Math.max(0, Math.min(geometry.n - 1, i)),
    [geometry.n]
  )

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (geometry.n === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const relX = ((event.clientX - rect.left) / rect.width) * chartWidth
    setActiveIndex(clampIndex(Math.round((relX - geometry.padLeft) / (geometry.step || 1))))
  }

  const handleChartKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (geometry.n === 0) return
    const base = activeIndex ?? geometry.n - 1
    let next: number

    switch (event.key) {
      case "ArrowRight":
        next = clampIndex(base + 1)
        break
      case "ArrowLeft":
        next = clampIndex(base - 1)
        break
      case "PageUp":
        next = clampIndex(base + 7)
        break
      case "PageDown":
        next = clampIndex(base - 7)
        break
      case "Home":
        next = 0
        break
      case "End":
        next = geometry.n - 1
        break
      case "Escape":
        event.preventDefault()
        setActiveIndex(null)
        return
      default:
        return
    }

    event.preventDefault()
    setActiveIndex(next)
  }

  const handleExport = () => {
    if (!metric) return
    const rows = windowed.current.map((value, i) => ({
      date: windowed.dates[i],
      current: value,
      previous: windowed.previous?.[i],
    }))

    if (onExport) {
      onExport(rows, metric)
      return
    }

    const header = ["date", `${metric.label} (current)`]
    if (windowed.previous) header.push(`${metric.label} (previous period)`)

    const body = rows.map((row) => {
      const cells = [row.date.toISOString().slice(0, 10), row.current.toFixed(2)]
      if (windowed.previous) cells.push((row.previous ?? 0).toFixed(2))
      return cells
    })

    const csv = [header, ...body].map((r) => r.map((c) => csvEscape(String(c))).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${metric.id}-${range?.id ?? "export"}.csv`
    anchor.style.display = "none"
    // Firefox needs the anchor in the document, and revoking the URL in the
    // same tick cancels the download — so defer both cleanups.
    document.body.appendChild(anchor)
    anchor.click()
    window.setTimeout(() => {
      anchor.remove()
      URL.revokeObjectURL(url)
    }, 0)
  }

  /* -------------------------------- render ------------------------------- */

  const panelId = `mtc-panel-${uid}`
  const liveId = `mtc-live-${uid}`
  const tableId = `mtc-table-${uid}`
  const tabId = (id: string) => `mtc-tab-${uid}-${id}`

  if (!metric || timelineLength === 0) {
    return (
      <div
        data-slot="metric-trend-chart"
        className={cn(
          "bg-card text-card-foreground border-border w-full rounded-xl border p-6 sm:p-8",
          className
        )}
      >
        {emptyState ?? <p className="text-muted-foreground text-sm">No data to display.</p>}
      </div>
    )
  }

  const active =
    activeIndex !== null && activeIndex < geometry.n
      ? {
          x: geometry.xAt(activeIndex),
          date: windowed.dates[activeIndex],
          current: windowed.current[activeIndex],
          previous: windowed.previous?.[activeIndex],
        }
      : null

  const activeDelta =
    active && active.previous !== undefined && active.previous !== 0
      ? ((active.current - active.previous) / active.previous) * 100
      : null
  const activeDeltaPositive =
    activeDelta === null ? null : (metric.higherIsBetter ?? true) ? activeDelta >= 0 : activeDelta <= 0

  const chartSummary = `${metric.label} trend, ${shortDate(windowed.dates[0])} to ${shortDate(
    windowed.dates[geometry.n - 1]
  )}, ${geometry.n} data points${
    hasComparison ? ", with the previous period for comparison" : ""
  }. Use the arrow keys to read individual values.`

  const multiMetric = metrics.length > 1

  return (
    <div
      data-slot="metric-trend-chart"
      className={cn(
        "bg-card text-card-foreground border-border w-full rounded-xl border p-5 shadow-sm sm:p-7",
        className
      )}
    >
      {/* ---------------------------- header ---------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {title ? <h3 className="truncate text-xl font-bold tracking-tight">{title}</h3> : null}
          {description !== null && (
            <p className="text-muted-foreground mt-1 text-base">
              {description ??
                `Daily trend${
                  hasComparison ? `, compared to the previous ${geometry.n}-day period` : ""
                }`}
            </p>
          )}
        </div>

        {rangeOptions.length > 1 && (
          <div
            data-slot="range-switcher"
            role="radiogroup"
            aria-label="Date range"
            className="bg-muted/50 border-border flex items-center gap-1 rounded-lg border p-1"
          >
            {rangeOptions.map((r) => {
              const selected = r.id === range?.id
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-item-id={r.id}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setRangeId(r.id)}
                  onKeyDown={(e) =>
                    rovingKeyDown(
                      e,
                      rangeOptions.map((o) => o.id),
                      range?.id ?? "",
                      setRangeId
                    )
                  }
                  className={cn(
                    "focus-visible:ring-ring rounded-md px-2.5 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    selected
                      ? "bg-background text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-medium"
                  )}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* --------------------------- KPI cards -------------------------- */}
      {multiMetric && (
        <div
          data-slot="metric-tabs"
          role="tablist"
          aria-label="Metric"
          aria-orientation="horizontal"
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {cards.map(({ metric: m, currentAgg, delta, positive }) => {
            const selected = m.id === metric.id
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                id={tabId(m.id)}
                aria-selected={selected}
                aria-controls={panelId}
                data-item-id={m.id}
                tabIndex={selected ? 0 : -1}
                onClick={() => setMetricId(m.id)}
                onKeyDown={(e) =>
                  rovingKeyDown(
                    e,
                    metrics.map((o) => o.id),
                    metric.id,
                    setMetricId
                  )
                }
                className={cn(
                  "focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  selected
                    ? m.color
                      ? "border-transparent"
                      : "border-primary bg-primary/10"
                    : "border-border hover:bg-accent/50"
                )}
                style={
                  selected && m.color
                    ? {
                        borderColor: m.color,
                        backgroundColor: `color-mix(in oklab, ${m.color} 10%, transparent)`,
                      }
                    : undefined
                }
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", !m.color && "bg-primary")}
                    style={m.color ? { backgroundColor: m.color } : undefined}
                  />
                  <span className="text-muted-foreground truncate text-xs font-medium tracking-wider uppercase">
                    {m.label}
                  </span>
                </span>
                <span className="text-2xl leading-none font-bold tracking-tight tabular-nums">
                  {formatValue(currentAgg, m)}
                </span>
                {delta !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums",
                      positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}
                  >
                    {delta >= 0 ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    )}
                    {Math.abs(delta).toFixed(1)}%
                    <span className="sr-only">
                      {delta >= 0 ? " increase" : " decrease"} versus the previous period
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ----------------------------- legend --------------------------- */}
      <div
        data-slot="legend"
        className="border-border text-muted-foreground mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn("inline-block h-0.5 w-4 rounded-full", usesThemePrimary && "bg-primary")}
            style={usesThemePrimary ? undefined : { backgroundColor: seriesColor }}
          />
          {shortDate(windowed.dates[0])} – {shortDate(windowed.dates[geometry.n - 1])}
        </span>

        {hasComparison && (
          <span
            className={cn("inline-flex items-center gap-1.5", usesThemePrimary && "text-primary")}
          >
            <svg width={16} height={4} aria-hidden="true" className="shrink-0">
              <line
                x1={0}
                y1={2}
                x2={16}
                y2={2}
                stroke={seriesColor}
                strokeWidth={1.25}
                strokeDasharray="3 2"
                opacity={0.5}
              />
            </svg>
            <span className="text-muted-foreground">
              {previousWindowDates
                ? `${shortDate(previousWindowDates.from)} – ${shortDate(previousWindowDates.to)}`
                : "Previous period"}
            </span>
          </span>
        )}

        {geometry.markers.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <svg width={10} height={12} aria-hidden="true" className="shrink-0">
              <line
                x1={5}
                y1={0}
                x2={5}
                y2={12}
                className="stroke-border"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
            </svg>
            Event
          </span>
        )}

        {geometry.bands.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-muted-foreground/25 inline-block h-2.5 w-3.5 rounded-sm" />
            Campaign
          </span>
        )}
      </div>

      {/* ------------------------------ chart --------------------------- */}
      <div
        id={panelId}
        role={multiMetric ? "tabpanel" : undefined}
        aria-labelledby={multiMetric ? tabId(metric.id) : undefined}
        className="relative mt-2"
        ref={plotRef}
      >
        <svg
          data-slot="chart"
          width={chartWidth}
          height={geometry.totalHeight}
          viewBox={`0 0 ${chartWidth} ${geometry.totalHeight}`}
          className={cn(
            "focus-visible:ring-ring w-full touch-none rounded-md focus-visible:ring-2 focus-visible:outline-none",
            usesThemePrimary && "text-primary"
          )}
          role="img"
          tabIndex={0}
          aria-label={chartSummary}
          aria-describedby={liveId}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          onKeyDown={handleChartKeyDown}
          onFocus={() => setActiveIndex((i) => (i === null ? geometry.n - 1 : i))}
          onBlur={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={`mtc-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor} stopOpacity={0.24} />
              <stop offset="100%" stopColor={seriesColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* gridlines + y axis */}
          {geometry.yTicks.map((value, i) => {
            const y = geometry.yAt(value)
            return (
              <g key={value}>
                <line
                  x1={geometry.padLeft}
                  x2={chartWidth - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  data-slot="y-tick"
                  x={geometry.padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={AXIS_FONT}
                  className="fill-muted-foreground"
                >
                  {geometry.axisLabels[i]}
                </text>
              </g>
            )
          })}

          {/* campaign bands */}
          {geometry.bands.map((b) => (
            <rect
              key={b.id}
              x={b.x}
              y={geometry.padTop}
              width={b.width}
              height={geometry.plotHeight}
              className="fill-muted-foreground"
              opacity={0.12}
            />
          ))}

          {/* series */}
          {geometry.areaPath && (
            <path d={geometry.areaPath} fill={`url(#mtc-area-${uid})`} stroke="none" />
          )}
          {hasComparison && geometry.ghostPath && (
            <path
              d={geometry.ghostPath}
              fill="none"
              stroke={seriesColor}
              strokeWidth={1.25}
              strokeDasharray="4 3"
              strokeLinecap="round"
              opacity={0.5}
            />
          )}
          <path
            d={geometry.linePath}
            fill="none"
            stroke={seriesColor}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* event markers */}
          {geometry.markers.map((m) => (
            <line
              key={m.id}
              x1={m.x}
              x2={m.x}
              y1={geometry.padTop}
              y2={geometry.baselineY}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}

          {/* annotation labels, laid out collision-free */}
          {geometry.labels.map((l) => (
            <text
              key={`label-${l.id}`}
              data-slot="annotation-label"
              x={l.x}
              y={geometry.padTop - 4 - (geometry.labelRows - 1 - l.row) * LABEL_ROW_H}
              textAnchor="middle"
              fontSize={LABEL_FONT}
              fontWeight={600}
              className="fill-muted-foreground"
            >
              {l.text}
            </text>
          ))}

          {/* x axis */}
          {geometry.tickIndices.map((idx) => (
            <text
              key={idx}
              data-slot="x-tick"
              x={geometry.xAt(idx)}
              y={geometry.totalHeight - 8}
              textAnchor={idx === 0 ? "start" : idx === geometry.n - 1 ? "end" : "middle"}
              fontSize={AXIS_FONT}
              className="fill-muted-foreground"
            >
              {shortDate(windowed.dates[idx])}
            </text>
          ))}

          {/* active point */}
          {active && (
            <g>
              <line
                x1={active.x}
                x2={active.x}
                y1={geometry.padTop}
                y2={geometry.baselineY}
                className="stroke-border"
                strokeWidth={1}
              />
              {active.previous !== undefined && (
                <circle
                  cx={active.x}
                  cy={geometry.yAt(active.previous)}
                  r={4}
                  fill={seriesColor}
                  fillOpacity={0.45}
                  className="stroke-card"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={active.x}
                cy={geometry.yAt(active.current)}
                r={4}
                fill={seriesColor}
                className="stroke-card"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* Visual tooltip; screen readers get the live region below instead. */}
        {active && (
          <div
            data-slot="tooltip"
            aria-hidden="true"
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute z-10 w-48 rounded-lg border p-3 text-sm shadow-md"
            style={{
              left: `${(active.x / chartWidth) * 100}%`,
              top: `${
                (Math.min(
                  geometry.yAt(active.current),
                  active.previous !== undefined ? geometry.yAt(active.previous) : Infinity
                ) /
                  geometry.totalHeight) *
                100
              }%`,
              transform: `translate(${
                active.x / chartWidth > 0.8 ? "-88%" : active.x / chartWidth < 0.2 ? "-12%" : "-50%"
              }, -110%)`,
            }}
          >
            <div className="mb-1.5 font-bold">{longDate(active.date)}</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block h-0.5 w-2.5 rounded-full",
                    usesThemePrimary && "bg-primary"
                  )}
                  style={usesThemePrimary ? undefined : { backgroundColor: seriesColor }}
                />
                Current
              </span>
              <span className="font-bold tabular-nums">
                {formatValue(active.current, metric)}
              </span>
            </div>
            {active.previous !== undefined && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block h-0.5 w-2.5 rounded-full opacity-50",
                      usesThemePrimary && "bg-primary"
                    )}
                    style={usesThemePrimary ? undefined : { backgroundColor: seriesColor }}
                  />
                  Previous
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatValue(active.previous, metric)}
                </span>
              </div>
            )}
            {activeDelta !== null && (
              <div className="border-border mt-1.5 flex items-center justify-between gap-2 border-t pt-1.5">
                <span className="text-muted-foreground">Change</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                    activeDeltaPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {activeDelta >= 0 ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                  {Math.abs(activeDelta).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}

        <div id={liveId} aria-live="polite" className="sr-only">
          {active
            ? `${longDate(active.date)}: ${formatValue(active.current, metric)}${
                active.previous !== undefined
                  ? `, previous period ${formatValue(active.previous, metric)}`
                  : ""
              }${
                activeDelta !== null
                  ? `, ${activeDelta >= 0 ? "up" : "down"} ${Math.abs(activeDelta).toFixed(
                      1
                    )} percent`
                  : ""
              }`
            : ""}
        </div>
      </div>

      {/* ----------------------------- actions -------------------------- */}
      {(showTable || showExport) && (
        <div className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-4">
          {showTable ? (
            <button
              type="button"
              onClick={() => setTableOpen((o) => !o)}
              aria-expanded={tableOpen}
              aria-controls={tableId}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Table2 className="size-3.5" aria-hidden="true" />
              {tableOpen ? "Hide table" : "View as table"}
            </button>
          ) : (
            <span />
          )}

          {showExport && (
            <button
              type="button"
              onClick={handleExport}
              className="border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export CSV
            </button>
          )}
        </div>
      )}

      {showTable && tableOpen && (
        <div
          id={tableId}
          data-slot="data-table"
          className="border-border mt-3 max-h-56 overflow-auto rounded-lg border"
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {metric.label} values for the selected range
              {windowed.previous ? ", with the previous period for comparison" : ""}.
            </caption>
            <thead className="bg-card text-muted-foreground sticky top-0">
              <tr className="border-border border-b">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Current
                </th>
                {windowed.previous && (
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Previous
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {windowed.current.map((value, i) => (
                <tr key={windowed.dates[i].toISOString()} className="border-border border-t">
                  <th scope="row" className="px-3 py-2 font-normal tabular-nums">
                    {shortDate(windowed.dates[i])}
                  </th>
                  <td className="px-3 py-2 tabular-nums">{formatValue(value, metric)}</td>
                  {windowed.previous && (
                    <td className="text-muted-foreground px-3 py-2 tabular-nums">
                      {formatValue(windowed.previous[i], metric)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MetricTrendChart
