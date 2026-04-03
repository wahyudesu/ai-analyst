"use client"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartConfig as LegacyChartConfig } from "./types"

interface LineChartProps {
  config: LegacyChartConfig
  className?: string
  skipAnimation?: boolean
}

// Format date strings to readable format
function formatXLabel(value: string): string {
  // Check if it's an ISO date string
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ||
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      // Use Intl.DateTimeFormat for proper "MMM DD, YYYY" format
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    }
  }
  return value
}

/**
 * Line chart component using Recharts with shadcn/ui pattern
 * Supports multiple series for trends over time
 */
export function LineChart({
  config,
  className,
  skipAnimation,
}: LineChartProps) {
  const { data, options, colors } = config
  const series = data.series || []

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-muted-foreground ${className || ""}`}
      >
        No data available
      </div>
    )
  }

  // Build shadcn chart config from legacy config
  // Use sanitized keys (no spaces) for CSS variables
  const sanitizedKeys = series.map((s, idx) => ({
    original: s.name,
    sanitized: s.name.replace(/\s+/g, "-").toLowerCase(),
    color: colors?.palette?.[idx] || s.color || `var(--chart-${(idx % 5) + 1})`,
  }))

  const shadcnConfig: ChartConfig = sanitizedKeys.reduce((acc, item) => {
    acc[item.sanitized] = {
      label: item.original,
      color: item.color,
    }
    return acc
  }, {} as ChartConfig)

  // Prepare data for Recharts with sanitized keys
  const chartData = series[0].data.map((point, index) => {
    const row: Record<string, unknown> = {
      _x: point.x,
      _label: point.label,
    }

    series.forEach((s, idx) => {
      if (s.data[index]) {
        // Use sanitized key for dataKey mapping
        row[sanitizedKeys[idx].sanitized] = s.data[index].y
      }
    })

    return row
  })

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <RechartsLineChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="_x"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={value => formatXLabel(String(value))}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={value =>
            typeof value === "number" ? value.toLocaleString() : String(value)
          }
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={label => {
            if (typeof label === "string" && /^\d{4}-\d{2}-\d{2}/.test(label)) {
              const date = new Date(label)
              if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(date)
              }
            }
            return String(label)
          }}
        />
        {sanitizedKeys.map(item => (
          <Line
            key={item.original}
            type="monotone"
            dataKey={item.sanitized}
            name={item.original}
            stroke={`var(--color-${item.sanitized})`}
            strokeWidth={2}
            dot={{ r: 4, fill: `var(--color-${item.sanitized})` }}
            activeDot={{ r: 6 }}
            animationDuration={skipAnimation ? 0 : 500}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}
