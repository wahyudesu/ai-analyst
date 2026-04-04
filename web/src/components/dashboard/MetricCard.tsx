import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type LucideIcon, Minus, TrendingDown, TrendingUp } from "lucide-react"
import { memo, useMemo } from "react"
import { type ComparisonMode, ComparisonToggle } from "./ComparisonToggle"

// Sparkline data type
export interface SparklineData {
  data: number[]
  color?: "emerald" | "rose" | "primary" | "auto" // auto = based on change
}

export interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  previousValue?: number
  changeLabel?: string
  icon?: LucideIcon
  className?: string
  trend?: "up" | "down" | "neutral"
  format?: "currency" | "number" | "percentage"
  // New props for comparison functionality
  comparisonMode?: ComparisonMode
  onComparisonChange?: (mode: ComparisonMode) => void
  showComparisonToggle?: boolean
  // Show previous period value
  showPreviousValue?: boolean
  // Custom labels
  previousPeriodLabel?: string
  // Sparkline mini chart
  sparkline?: SparklineData
}

// Simple sparkline SVG component
const Sparkline = memo(function Sparkline({
  data,
  color,
}: { data: number[]; color: "emerald" | "rose" | "primary" }) {
  if (!data || data.length < 2) return null

  const width = 80
  const height = 32
  const padding = 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y =
      height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const fillColor = {
    emerald: "rgba(16, 185, 129, 0.15)",
    rose: "rgba(244, 63, 94, 0.15)",
    primary: "rgba(99, 102, 241, 0.15)",
  }[color]

  const strokeColor = {
    emerald: "rgb(16, 185, 129)",
    rose: "rgb(244, 63, 94)",
    primary: "rgb(99, 102, 241)",
  }[color]

  // Create area path (closed loop for fill)
  const areaPath = `${points.join(" ")} L${width - padding},${height} L${padding},${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="opacity-80"
    >
      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />
      {/* Line stroke */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

// Memoized formatters to avoid creating new Intl instances on every render
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en-US")

const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === "string") return value

  switch (format) {
    case "currency":
      return currencyFormatter.format(value)
    case "percentage":
      return `${value.toFixed(1)}%`
    case "number":
    default:
      return numberFormatter.format(value)
  }
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  change,
  previousValue,
  changeLabel,
  icon: Icon,
  className,
  trend,
  format,
  comparisonMode = "mom",
  onComparisonChange,
  showComparisonToggle = false,
  showPreviousValue = false,
  previousPeriodLabel,
  sparkline,
}: MetricCardProps) {
  // Determine trend based on change value if not explicitly provided
  const calculatedTrend =
    trend ??
    (change === undefined
      ? "neutral"
      : change > 0
        ? "up"
        : change < 0
          ? "down"
          : "neutral")

  const TrendIcon =
    calculatedTrend === "up"
      ? TrendingUp
      : calculatedTrend === "down"
        ? TrendingDown
        : Minus
  const trendColor =
    calculatedTrend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : calculatedTrend === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"

  // Format the change value - round to 1 decimal place for cleaner display
  const displayChange =
    change !== undefined
      ? typeof change === "number" &&
        !changeLabel?.includes("%") &&
        Math.abs(change) < 1
        ? `${(change * 100).toFixed(1)}%`
        : typeof change === "number"
          ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%`
          : `${change}`
      : null

  // Determine sparkline color
  const sparklineColor =
    sparkline?.color === "auto"
      ? calculatedTrend === "up"
        ? "emerald"
        : calculatedTrend === "down"
          ? "rose"
          : "primary"
      : sparkline?.color ||
        (calculatedTrend === "up"
          ? "emerald"
          : calculatedTrend === "down"
            ? "rose"
            : "primary")

  return (
    <Card
      className={cn(
        "group hover:shadow-md hover:border-primary/20 transition-all duration-200",
        "border-border/50 has-[[data-state=open]]:border-primary/30",
        className
      )}
    >
      <CardContent>
        <div className="flex flex-col gap-2.5">
          {/* Header row: title + optional comparison toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {Icon && (
                <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              )}
              <p
                className="text-xs sm:text-sm text-muted-foreground truncate font-medium"
                title={title}
              >
                {title}
              </p>
            </div>
            {showComparisonToggle && onComparisonChange && (
              <ComparisonToggle
                value={comparisonMode}
                onChange={onComparisonChange}
                size="sm"
              />
            )}
          </div>

          {/* Value row: main value + change indicator + optional sparkline */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0 flex-1 overflow-hidden">
              <p
                className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight tabular-nums truncate"
                title={formatValue(value, format)}
              >
                {formatValue(value, format)}
              </p>
              {displayChange && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs shrink-0",
                    trendColor
                  )}
                >
                  <TrendIcon className="w-3 h-3 shrink-0" />
                  <span className="font-semibold tabular-nums whitespace-nowrap">
                    {displayChange}
                  </span>
                </div>
              )}
            </div>
            {sparkline && sparkline.data.length > 0 && (
              <Sparkline data={sparkline.data} color={sparklineColor} />
            )}
          </div>

          {/* Optional: Previous period info */}
          {showPreviousValue && previousValue !== undefined && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                {previousPeriodLabel || "Previous period"}:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatValue(previousValue, format)}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
